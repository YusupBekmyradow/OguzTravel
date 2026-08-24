import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Cafeteria } from './entities/cafeteria.entity';
import { CreateCafeteriaDto } from './dto/create-cafeteria.dto';
import { UpdateCafeteriaDto } from './dto/update-cafeteria.dto';
import { Employee } from '../employee/entities/employee.entity';
import { User } from '../user/entities/user.entity';
import { Office } from '../office/entities/office.entity';
import { errorResponse } from '../../helpers/responseFunctions';
import { HttpStatuses } from '../../helpers/httpStatuses.enum';
import { Op } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { I18nService } from 'nestjs-i18n';

@Injectable()
export class CafeteriaService {
  constructor(
    @InjectModel(Cafeteria) private cafeteriaRepo: typeof Cafeteria,
    @InjectModel(User) private userRepo: typeof User,
    @InjectModel(Employee) private employeeRepo: typeof Employee,
    private sequelize: Sequelize,
    private readonly i18n: I18nService,
  ) {}

  private getIncludes() {
    return [
      {
        model: Employee,
        as: 'createdBy',
        attributes: ['guid', 'fullName', 'phone_number'],
        include: [{ model: Office, attributes: ['guid', 'fullName', 'shortName'] }],
      },
    ];
  }

  async addCafeteria(dto: CreateCafeteriaDto, userPayload: any, lang: string = 'tk') {
    try {
      let validEmployeeGuid: string | null = null;
      const directGuid = userPayload?.employee_guid || userPayload?.guid || userPayload?.id;

      if (directGuid) {
        const emp = await this.employeeRepo.findByPk(directGuid);
        if (emp) {
          validEmployeeGuid = emp.guid;
        } else {
          const user = await this.userRepo.findByPk(directGuid);
          if (user?.employee_guid) {
            const userEmp = await this.employeeRepo.findByPk(user.employee_guid);
            if (userEmp) {
              validEmployeeGuid = userEmp.guid;
            }
          }
        }
      }

      const item = await this.cafeteriaRepo.create({
        ...dto,
        created_by_guid: validEmployeeGuid,
      } as any);

      const createdItem = await this.cafeteriaRepo.findOne({
        where: { guid: item.guid },
        include: this.getIncludes(),
      });

      return {
        status: 201,
        data: createdItem,
        message: 'Cafeteria transaction created successfully',
      };
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Create failed', error);
    }
  }

  async getAllCafeteria(
    page: number = 1,
    limit: number = 20,
    filters?: {
      search?: string;
      start_date?: string;
      end_date?: string;
      type?: boolean | string;
    },
    lang: string = 'tk',
  ) {
    try {
      const currentPage = Math.max(1, Number(page));
      const currentLimit = Math.max(1, Number(limit));
      const offset = (currentPage - 1) * currentLimit;
      const whereConditions: any = {};

      if (filters) {
        if (filters.search && filters.search.trim() !== '') {
          whereConditions.description = {
            [Op.iLike]: `%${filters.search.trim()}%`,
          };
        }
        if (filters.start_date && filters.end_date) {
          whereConditions.date = {
            [Op.between]: [filters.start_date, filters.end_date],
          };
        } else if (filters.start_date) {
          whereConditions.date = { [Op.gte]: filters.start_date };
        } else if (filters.end_date) {
          whereConditions.date = { [Op.lte]: filters.end_date };
        }

        if (filters.type !== undefined && filters.type !== null && filters.type !== '') {
          whereConditions.type = String(filters.type) === 'true';
        }
      }

      const { rows, count } = await this.cafeteriaRepo.findAndCountAll({
        where: whereConditions,
        include: this.getIncludes(),
        order: [['date', 'DESC'], ['index_number', 'DESC']],
        limit: currentLimit,
        offset: offset,
      });

      return {
        status: 200,
        data: rows,
        meta: {
          totalItems: count,
          totalPages: Math.ceil(count / currentLimit),
          currentPage: currentPage,
        },
        message: 'Cafeteria list fetched',
      };
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Fetch failed', error);
    }
  }

  async getSummary(
    filters?: {
      search?: string;
      start_date?: string;
      end_date?: string;
      type?: boolean | string;
    },
  ) {
    try {
      const whereConditions: any = {};

      if (filters) {
        if (filters.search && filters.search.trim() !== '') {
          whereConditions.description = {
            [Op.iLike]: `%${filters.search.trim()}%`,
          };
        }
        if (filters.start_date && filters.end_date) {
          whereConditions.date = {
            [Op.between]: [filters.start_date, filters.end_date],
          };
        } else if (filters.start_date) {
          whereConditions.date = { [Op.gte]: filters.start_date };
        } else if (filters.end_date) {
          whereConditions.date = { [Op.lte]: filters.end_date };
        }

        if (filters.type !== undefined && filters.type !== null && filters.type !== '') {
          whereConditions.type = String(filters.type) === 'true';
        }
      }

      const incomeRaw = await this.cafeteriaRepo.sum('amount', {
        where: { ...whereConditions, type: true },
      });
      const expenseRaw = await this.cafeteriaRepo.sum('amount', {
        where: { ...whereConditions, type: false },
      });

      const totalIncome = Number(Number(incomeRaw || 0).toFixed(2));
      const totalExpense = Number(Number(expenseRaw || 0).toFixed(2));
      const balance = Number((totalIncome - totalExpense).toFixed(2));

      return {
        status: 200,
        data: {
          totalIncome,
          totalExpense,
          balance,
        },
        message: 'Cafeteria summary fetched',
      };
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Summary fetch failed', error);
    }
  }

  async updateCafeteria(dto: UpdateCafeteriaDto, lang: string = 'tk') {
    try {
      const item = await this.cafeteriaRepo.findOne({ where: { guid: dto.guid } });
      if (!item) {
        return errorResponse(HttpStatuses.NOT_FOUND, 'Cafeteria transaction not found');
      }

      await item.update(dto as any);
      const updated = await this.cafeteriaRepo.findOne({
        where: { guid: dto.guid },
        include: this.getIncludes(),
      });

      return {
        status: 200,
        data: updated,
        message: 'Cafeteria transaction updated',
      };
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Update failed', error);
    }
  }

  async deleteCafeteria(guid: string, lang: string = 'tk') {
    try {
      const item = await this.cafeteriaRepo.findOne({ where: { guid } });
      if (!item) {
        return errorResponse(HttpStatuses.NOT_FOUND, 'Cafeteria transaction not found');
      }

      await item.destroy();
      return {
        status: 200,
        data: { guid },
        message: 'Cafeteria transaction deleted',
      };
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Delete failed', error);
    }
  }
}
