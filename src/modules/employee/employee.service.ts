import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { InjectModel } from '@nestjs/sequelize';
import { Employee } from './entities/employee.entity';
import { errorResponse, successResponse } from '../../helpers/responseFunctions';
import { HttpStatuses } from '../../helpers/httpStatuses.enum';
import { Office } from '../office/entities/office.entity';
import { Position } from '../position/entities/position.entity';
import { Department } from '../department/entities/department.entity';
import { DataTypes, Op, QueryTypes } from 'sequelize';
import { I18nService } from 'nestjs-i18n';
import { Sequelize } from 'sequelize-typescript';
import { SalaryService } from '../salary/salary.service';

@Injectable()
export class EmployeeService implements OnModuleInit {
  private readonly logger = new Logger(EmployeeService.name);

  constructor(
    @InjectModel(Employee) private employeeRepository: typeof Employee,
    @InjectModel(Position) private positionRepository: typeof Position,
    private readonly i18n: I18nService,
    private readonly sequelize: Sequelize,
    private readonly salaryService: SalaryService,
  ) { }

  async onModuleInit() {
    const queryInterface = this.sequelize.getQueryInterface();
    const table = await queryInterface.describeTable('tbl_employees');
    if (!table.is_active) {
      await queryInterface.addColumn('tbl_employees', 'is_active', {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      });
      this.logger.log('Added column tbl_employees.is_active');
    }
  }

  async addEmployee(createEmployeeDto: CreateEmployeeDto, lang: string) {
    try {
      if (createEmployeeDto.gmail) {
        const normalizedGmail = createEmployeeDto.gmail.trim().toLowerCase();
        createEmployeeDto.gmail = normalizedGmail;

        const existingEmployee = await this.employeeRepository.findOne({
          where: { gmail: normalizedGmail },
        });
        if (existingEmployee) {
          return errorResponse(
            HttpStatuses.CONFLICT,
            this.i18n.t('employee.gmailAlreadyExists', { lang }),
          );
        }
      }

      const employee = await this.employeeRepository.create({
        ...createEmployeeDto
      } as any);
      const newEmployee = await this.employeeRepository.findOne({
        where: { guid: employee.guid },
        include: [
          { model: Office, attributes: ['guid', 'fullName', 'shortName'] },
          { model: Department, attributes: ['guid', 'name'] }
        ]
      });
      if (!newEmployee) {
        return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('employee.notFoundAfterCreate', { lang }));
      }
      let positions: any[] = [];
      if (newEmployee.position_guids && newEmployee.position_guids.length > 0) {
        positions = await Position.findAll({
          where: { guid: { [Op.in]: newEmployee.position_guids } },
          attributes: ['guid', 'name'],
          raw: true
        });
      }
      const responseData = {
        ...newEmployee.toJSON(),
        positions
      };
      await this.salaryService.ensureCurrentMonthRow(newEmployee.guid, (newEmployee as any).createdAt);
      return {
        status: 201,
        data: responseData,
        message: this.i18n.t('employee.created', { lang }),
      };
    } catch (error) {
      const err=error as any;
      if (
        err?.name === 'SequelizeUniqueConstraintError' ||
        err?.name === 'UniqueConstraintError'
      ) {
        const isGmail =
          err?.fields?.gmail ||
          err?.errors?.some((e: any) => e.path === 'gmail');
        if (isGmail) {
          return errorResponse(
            HttpStatuses.CONFLICT,
            this.i18n.t('employee.gmailAlreadyExists', { lang }),
            error,
          );
        }
        return errorResponse(
          HttpStatuses.CONFLICT,
          this.i18n.t('common.uniqueError', { lang }) || 'Bu maglumat ulgamda eýýäm bar.',
          error,
        );
      }
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('employee.createFailed', { lang }), error);
    }
  }


  async getAllEmployee(
    page: number = 1,
    limit: number = 10,
    search?: string,
    filters?: { department_guid?: string; office_guid?: string; position_guids?: string | string[]; is_active?: string },
    lang: string = 'tk',
  ) {
    try {
      const currentPage = Math.max(1, Number(page));
      const currentLimit = Math.max(1, Number(limit));
      const offset = (currentPage - 1) * currentLimit;

      const conditions: string[] = ['1=1'];
      const replacements: any = { limit: currentLimit, offset };

      if (filters?.department_guid) {
        conditions.push('e.department_guid = :department_guid');
        replacements.department_guid = filters.department_guid;
      }
      if (filters?.office_guid) {
        conditions.push('e.office_guid = :office_guid');
        replacements.office_guid = filters.office_guid;
      }
      if (filters?.is_active === 'true' || filters?.is_active === 'false') {
        conditions.push('e.is_active = :is_active');
        replacements.is_active = filters.is_active === 'true';
      }
      if (filters?.position_guids) {
        const posArray = Array.isArray(filters.position_guids) ? filters.position_guids : [filters.position_guids];
        if (posArray.length > 0) {
          conditions.push('e.position_guids && ARRAY[:position_guids]::uuid[]');
          replacements.position_guids = posArray;
        }
      }
      if (search) {
        conditions.push('(e."fullName" ILIKE :search OR e.gmail ILIKE :search)');
        replacements.search = `%${search.trim()}%`;
      }

      const query = `
      SELECT 
        e.guid, e."fullName", e.phone_number, e.gmail, e.index_number, e.position_guids, e.is_active, e."createdAt", e."updatedAt",
        json_build_object('guid', o.guid, 'fullName', o."fullName", 'shortName', o."shortName") AS office,
        json_build_object('guid', d.guid, 'name', d.name) AS department,
        COALESCE((
          SELECT json_agg(json_build_object('guid', p.guid, 'name', p.name))
          FROM tbl_positions p WHERE p.guid = ANY(e.position_guids)
        ), '[]'::json) AS positions,
        COALESCE(e.empl_loan, 0) AS empl_loan,
        COALESCE((
          SELECT SUM(s.loan)
          FROM tbl_salary s
          WHERE s.employee_guid = e.guid
        ), 0) AS salary_loans_total,
        ROUND(
          COALESCE(e.empl_loan, 0) - COALESCE((
            SELECT SUM(s.loan)
            FROM tbl_salary s
            WHERE s.employee_guid = e.guid
          ), 0),
          2
        ) AS remaining_loan,
        COUNT(*) OVER() AS total_count
      FROM tbl_employees e
      LEFT JOIN tbl_offices o ON o.guid = e.office_guid
      LEFT JOIN tbl_departments d ON d.guid = e.department_guid
      WHERE ${conditions.join(' AND ')}
      ORDER BY e.index_number DESC
      LIMIT :limit OFFSET :offset;
    `;
      const rows: any[] = await this.sequelize.query(query, {
        replacements,
        type: QueryTypes.SELECT,
      });

      const totalItems = rows.length > 0 ? Number(rows[0].total_count) : 0;
      const cleanData = rows.map(({ total_count, ...rest }) => rest);

      return {
        status: 200,
        data: cleanData,
        meta: {
          totalItems,
          totalPages: Math.ceil(totalItems / currentLimit),
          currentPage,
        },
        message: this.i18n.t('employee.listFetched', { lang }),
      };
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('employee.fetchFailed', { lang }), error);
    }
  }


  async getEmployeeLoanDetails(employee_guid: string, lang: string = 'tk') {
    try {
      const employee = await this.employeeRepository.findOne({
        where: { guid: employee_guid },
        attributes: ['guid', 'fullName', 'empl_loan'],
        raw: true,
      });
      if (!employee) {
        return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('employee.notFound', { lang }));
      }

      const salaryLoans: any[] = await this.sequelize.query(
        `
        SELECT
          s.guid,
          s.month,
          s.loan,
          s.paid_date
        FROM tbl_salary s
        WHERE s.employee_guid = :employee_guid
          AND s.loan > 0
        ORDER BY s.month ASC
        `,
        {
          replacements: { employee_guid },
          type: QueryTypes.SELECT,
        },
      );
      const salary_loans_total = salaryLoans.reduce(
        (sum, row) => sum + Number(row.loan || 0),
        0,
      );
      const empl_loan = Number((employee as any).empl_loan || 0);
      const remaining_loan = Math.round((empl_loan - salary_loans_total) * 100) / 100;

      return {
        status: 200,
        data: {
          employee_guid: (employee as any).guid,
          fullName: (employee as any).fullName,
          empl_loan,
          salary_loans_total: Math.round(salary_loans_total * 100) / 100,
          remaining_loan,
          loans: salaryLoans.map((row) => ({
            guid: row.guid,
            month: row.month,
            loan: Number(row.loan),
            paid_date: row.paid_date ?? null,
          })),
        },
        message: this.i18n.t('employee.listFetched', { lang }),
      };
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('employee.fetchFailed', { lang }), error);
    }
  }


  async getEmployeeForPosition(
    page: number = 1,
    limit: number = 10,
    position_guids: string | string[],
    lang: string = 'tk',
  ) {
    try {
      const currentPage = Math.max(1, Number(page));
      const currentLimit = Math.max(1, Number(limit));
      const offset = (currentPage - 1) * currentLimit;
      const targetPositions = Array.isArray(position_guids) ? position_guids : [position_guids];
      const query = `
      SELECT 
        e.guid, e."fullName", e.position_guids,
        json_build_object('guid', o.guid, 'fullName', o."fullName", 'shortName', o."shortName") AS office,
        COUNT(*) OVER() AS total_count
      FROM tbl_employees e
      LEFT JOIN tbl_offices o ON o.guid = e.office_guid
      WHERE e.position_guids && ARRAY[:targetPositions]::uuid[]
      ORDER BY e.index_number DESC
      LIMIT :limit OFFSET :offset;
    `;
      const rows: any[] = await this.sequelize.query(query, {
        replacements: { targetPositions, limit: currentLimit, offset },
        type: QueryTypes.SELECT,
      });
      const totalItems = rows.length > 0 ? Number(rows[0].total_count) : 0;
      const cleanData = rows.map(({ total_count, ...rest }) => rest);
      return {
        status: 200,
        data: cleanData,
        meta: {
          totalItems,
          totalPages: Math.ceil(totalItems / currentLimit),
          currentPage,
        },
        message: this.i18n.t('employee.positionFetched', { lang }),
      };
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('employee.positionFetchFailed', { lang }), error);
    }
  }



  async updateEmployee(updateEmployeeDto: UpdateEmployeeDto, lang: string) {
    try {
      const employee = await this.employeeRepository.findByPk(updateEmployeeDto.guid);
      if (!employee) {
        return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('employee.notFound', { lang }));
      }

      if (updateEmployeeDto.gmail) {
        const normalizedGmail = updateEmployeeDto.gmail.trim().toLowerCase();
        updateEmployeeDto.gmail = normalizedGmail;

        const existingEmployee = await this.employeeRepository.findOne({
          where: {
            gmail: normalizedGmail,
            guid: { [Op.ne]: updateEmployeeDto.guid },
          },
        });
        if (existingEmployee) {
          return errorResponse(
            HttpStatuses.CONFLICT,
            this.i18n.t('employee.gmailAlreadyExists', { lang }),
          );
        }
      }

      const wasInactive = employee.is_active === false;
      await employee.update({
        ...updateEmployeeDto,
      } as any);
      if (wasInactive && updateEmployeeDto.is_active === true) {
        await this.salaryService.ensureCurrentMonthRow(employee.guid, new Date());
      }
      const updatedEmployee = await this.employeeRepository.findOne({
        where: { guid: employee.guid },
        include: [
          { model: Office, attributes: ['guid', 'fullName', 'shortName'] },
          { model: Department, attributes: ['guid', 'name'] },
        ],
      });

      if (!updatedEmployee) {
        return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('employee.notFound', { lang }));
      }
      const employeeData = updatedEmployee.toJSON();
      let positions: any[] = [];
      if (employeeData.position_guids && employeeData.position_guids.length > 0) {
        positions = await this.positionRepository.findAll({
          where: {
            guid: {
              [Op.in]: employeeData.position_guids,
            },
          },
          attributes: ['guid', 'name'],
        });
      }
      return {
        status: 200,
        data: {
          ...employeeData,
          positions,
        },
        message: this.i18n.t('employee.updated', { lang }),
      };
    } catch (error) {
      const err = error as any;
      if (
        err?.name === 'SequelizeUniqueConstraintError' ||
        err?.name === 'UniqueConstraintError'
      ) {
        const isGmail =
          err?.fields?.gmail ||
          err?.errors?.some((e: any) => e.path === 'gmail');
        if (isGmail) {
          return errorResponse(
            HttpStatuses.CONFLICT,
            this.i18n.t('employee.gmailAlreadyExists', { lang }),
            error,
          );
        }
        return errorResponse(
          HttpStatuses.CONFLICT,
          this.i18n.t('common.uniqueError', { lang }) || 'Bu maglumat ulgamda eýýäm bar.',
          error,
        );
      }
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('employee.updateFailed', { lang }), error);
    }
  }



  async deleteEmployee(guid: string, lang: string) {
    try {
      const employee = await this.employeeRepository.findByPk(guid);
      if (!employee) {
        return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('employee.notFound', { lang }));
      }
      await employee.destroy();
      return successResponse(HttpStatuses.OK, null, this.i18n.t('employee.deleted', { lang }));
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('employee.deleteFailed', { lang }), error);
    }
  }
}
