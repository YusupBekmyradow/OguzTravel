import { Injectable } from '@nestjs/common';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { InjectModel } from '@nestjs/sequelize';
import { Employee } from './entities/employee.entity';
import { errorResponse, successResponse } from '../../helpers/responseFunctions';
import { HttpStatuses } from '../../helpers/httpStatuses.enum';
import { Office } from '../office/entities/office.entity';
import { Position } from '../position/entities/position.entity';
import { Department } from '../department/entities/department.entity';
import { Op } from 'sequelize';
import { I18nService } from 'nestjs-i18n';

@Injectable()
export class EmployeeService {
  constructor(
    @InjectModel(Employee) private employeeRepository: typeof Employee,
    private readonly i18n: I18nService,
  ) { }

  async addEmployee(createEmployeeDto: CreateEmployeeDto, lang: string) {
    try {
      const employee = await this.employeeRepository.create({
        ...createEmployeeDto
      } as any);

      const newEmployee = await this.employeeRepository.findOne({
        where: { guid: employee.guid },
        include: [
          { model: Office, attributes: ['guid', 'fullName', 'shortName'] },
          { model: Position, attributes: ['guid', 'name'] },
          { model: Department, attributes: ['guid', 'name'] }
        ]
      });
      if (!newEmployee) {
        return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('employee.notFoundAfterCreate', { lang }));
      }
      return {
        status: 201,
        data: newEmployee,
        message: this.i18n.t('employee.created', { lang }),
      };
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('employee.createFailed', { lang }), error);
    }
  }


  async getAllEmployee(
    page: number = 1,
    limit: number = 10,
    search?: string,
    filters?: { department_guid?: string, office_guid?: string, position_guid?: string },
    lang: string = 'tk',
  ) {
    try {
      const currentPage = Math.max(1, Number(page));
      const currentLimit = Math.max(1, Number(limit));

      const offset = (currentPage - 1) * currentLimit;

      const whereClause: any = {};
      if (filters?.department_guid) whereClause.department_guid = filters.department_guid;
      if (filters?.office_guid) whereClause.office_guid = filters.office_guid;
      if (filters?.position_guid) whereClause.position_guid = filters.position_guid;

      if (search) {
        const sanitizedSearch = search.trim();
        whereClause[Op.or] = [
          { fullName: { [Op.iLike]: `%${sanitizedSearch}%` } },
          { gmail: { [Op.iLike]: `%${sanitizedSearch}%` } },
        ];
      }
      const { count, rows } = await this.employeeRepository.findAndCountAll({
        where: whereClause,
        order: [['index_number', 'ASC']],
        limit: Number(limit),
        offset: Number(offset),
        include: [
          { model: Office, attributes: ['guid', 'fullName', 'shortName'] },
          { model: Position, attributes: ['guid', 'name'] },
          { model: Department, attributes: ['guid', 'name'] }
        ]
      });
      return {
        status: 200,
        data: rows,
        meta: {
          totalItems: count,
          totalPages: Math.ceil(count / limit),
          currentPage: currentPage
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
    position_guid: string,
    lang: string = 'tk',
  ) {
    try {
      const currentPage = Math.max(1, Number(page));
      const currentLimit = Math.max(1, Number(limit));

      const offset = (currentPage - 1) * currentLimit;

      const { count, rows } = await this.employeeRepository.findAndCountAll({
        where: { position_guid },
        attributes: ['guid', 'fullName'],
        order: [['index_number', 'ASC']],
        limit: Number(limit),
        offset: Number(offset),
        include: [
          { model: Office, attributes: ['guid', 'fullName', 'shortName'] }]
      });
      return {
        status: 200,
        data: rows,
        meta: {
          totalItems: count,
          totalPages: Math.ceil(count / limit),
          currentPage: currentPage
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
      await employee.update({
        ...updateEmployeeDto
      } as any);

      const updateEmployee = await this.employeeRepository.findOne({
        where: { guid: employee.guid },
        include: [
          { model: Office, attributes: ['guid', 'fullName', 'shortName'] },
          { model: Position, attributes: ['guid', 'name'] },
          { model: Department, attributes: ['guid', 'name'] }
        ]
      });

      return {
        status: 200,
        data: updateEmployee,
        message: this.i18n.t('employee.updated', { lang }),
      };
    } catch (error) {
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
