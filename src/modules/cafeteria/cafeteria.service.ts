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
import { I18nService } from 'nestjs-i18n';

@Injectable()
export class CafeteriaService {
  constructor(
    @InjectModel(Cafeteria) private cafeteriaRepo: typeof Cafeteria,
    @InjectModel(User) private userRepo: typeof User,
    @InjectModel(Employee) private employeeRepo: typeof Employee,
    private readonly i18n: I18nService,
  ) { }


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



  private buildWhereConditions(filters?: {
    search?: string; start_date?: string; end_date?: string; type?: boolean | string;
  }) {
    const where: any = {};
    if (!filters) return where;
    if (filters.search?.trim()) {
      where.description = { [Op.iLike]: `%${filters.search.trim()}%` };
    }
    if (filters.start_date && filters.end_date) {
      where.date = { [Op.between]: [filters.start_date, filters.end_date] };
    } else if (filters.start_date) {
      where.date = { [Op.gte]: filters.start_date };
    } else if (filters.end_date) {
      where.date = { [Op.lte]: filters.end_date };
    }
    if (filters.type !== undefined && filters.type !== null && filters.type !== '') {
      where.type = String(filters.type) === 'true';
    }
    return where;
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
            if (userEmp) validEmployeeGuid = userEmp.guid;
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
        message: await this.i18n.translate('cafeteria.createSuccess', { lang }),
      };
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, await this.i18n.translate('cafeteria.createFailed', { lang }), error);
    }
  }



  async getAllCafeteria(
    page: number = 1,
    limit: number = 20,
    filters?: { search?: string; start_date?: string; end_date?: string; type?: boolean | string },
    lang: string = 'tk',
  ) {
    try {
      const currentPage = Math.max(1, Number(page));
      const currentLimit = Math.max(1, Number(limit));
      const offset = (currentPage - 1) * currentLimit;

      const { rows, count } = await this.cafeteriaRepo.findAndCountAll({
        where: this.buildWhereConditions(filters),
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
        message: await this.i18n.translate('cafeteria.fetchSuccess', { lang }),
      };
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, await this.i18n.translate('cafeteria.fetchFailed', { lang }), error);
    }
  }
  async getSummary(
    filters?: { search?: string; start_date?: string; end_date?: string; type?: boolean | string },
    lang: string = 'tk',
  ) {
    try {
      const where = this.buildWhereConditions(filters);
      const incomeRaw = await this.cafeteriaRepo.sum('amount', { where: { ...where, type: true } });
      const expenseRaw = await this.cafeteriaRepo.sum('amount', { where: { ...where, type: false } });

      const totalIncome = Number(Number(incomeRaw || 0).toFixed(2));
      const totalExpense = Number(Number(expenseRaw || 0).toFixed(2));
      const balance = Number((totalIncome - totalExpense).toFixed(2));

      return {
        status: 200,
        data: { totalIncome, totalExpense, balance },
        message: await this.i18n.translate('cafeteria.summarySuccess', { lang }),
      };
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, await this.i18n.translate('cafeteria.summaryFailed', { lang }), error);
    }
  }



  async updateCafeteria(dto: UpdateCafeteriaDto, lang: string = 'tk') {
    try {
      const item = await this.cafeteriaRepo.findOne({ where: { guid: dto.guid } });
      if (!item) {
        return errorResponse(HttpStatuses.NOT_FOUND, await this.i18n.translate('cafeteria.notFound', { lang }));
      }
      const { guid, ...updateData } = dto;
      await item.update(updateData as any);

      const updated = await this.cafeteriaRepo.findOne({
        where: { guid: dto.guid },
        include: this.getIncludes(),
      });
      return {
        status: 200,
        data: updated,
        message: await this.i18n.translate('cafeteria.updateSuccess', { lang }),
      };
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, await this.i18n.translate('cafeteria.updateFailed', { lang }), error);
    }
  }




  async deleteCafeteria(guid: string, lang: string = 'tk') {
    try {
      const item = await this.cafeteriaRepo.findOne({ where: { guid } });
      if (!item) {
        return errorResponse(HttpStatuses.NOT_FOUND, await this.i18n.translate('cafeteria.notFound', { lang }));
      }

      await item.destroy();
      return {
        status: 200,
        data: { guid },
        message: await this.i18n.translate('cafeteria.deleteSuccess', { lang }),
      };
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, await this.i18n.translate('cafeteria.deleteFailed', { lang }), error);
    }
  }
}