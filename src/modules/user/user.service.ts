import { Injectable } from '@nestjs/common';
import { errorResponse, successResponse } from '../../helpers/responseFunctions';
import { InjectModel } from '@nestjs/sequelize';
import { User } from './entities/user.entity';
import { HttpStatuses } from '../../helpers/httpStatuses.enum';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Op } from 'sequelize';
import { Employee } from '../employee/entities/employee.entity';
import { I18nService } from 'nestjs-i18n';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User) private userRepository: typeof User,
    @InjectModel(Employee) private employeeRepository: typeof Employee,
    private readonly i18n: I18nService,
  ) { }

  async addUser(createUserDto: CreateUserDto, lang: string) {
    try {
      let finalPhoneNumber = createUserDto.phone_number;
      if (createUserDto.isExternalUser === false && createUserDto.employee_guid) {
        const employee = await this.employeeRepository.findOne({ where: { guid: createUserDto.employee_guid } });
        if (!employee) return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('user.employeeNotFound', { lang }));
        finalPhoneNumber = employee.phone_number;
      }
      const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
      const user = await this.userRepository.create({ ...createUserDto, password: hashedPassword, phone_number: finalPhoneNumber } as any);
      await user.reload({ include: [Employee] });
      const plainUser = user.get({ plain: true });
      const { password, refresh_token, ...userResponse } = plainUser;
      return successResponse(HttpStatuses.CREATED, userResponse, this.i18n.t('user.created', { lang }));
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('user.createFailed', { lang }), error);
    }
  }

  async getAllUser(page: number = 1, limit: number = 10, search?: string, filters?: { isActive?: boolean; isExternalUser?: boolean }, lang: string = 'tk') {
    try {
      const currentPage = Math.max(1, Number(page));
      const currentLimit = Math.max(1, Number(limit));
      const offset = (currentPage - 1) * currentLimit;
      const whereClause: any = {};
      if (filters?.isActive !== undefined) whereClause.isActive = filters.isActive;
      if (filters?.isExternalUser !== undefined) whereClause.isExternalUser = filters.isExternalUser;
      const employeeWhere: any = {};
      if (search) employeeWhere.fullName = { [Op.iLike]: `%${search.trim()}%` };
      const { count, rows } = await this.userRepository.findAndCountAll({ where: whereClause, limit: currentLimit, offset, order: [['createdAt', 'DESC']], include: [{ model: Employee, where: Object.keys(employeeWhere).length > 0 ? employeeWhere : undefined, required: !!search }] });
      const cleanedRows = rows.map(user => { const plainUser = user.get({ plain: true }); const { password, refresh_token, ...rest } = plainUser; return rest; });
      return { status: 200, data: cleanedRows, meta: { totalItems: count, totalPages: Math.ceil(count / limit), currentPage }, message: this.i18n.t('user.listFetched', { lang }) };
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('user.fetchFailed', { lang }), error);
    }
  }

  async updateUser(updateUserDto: UpdateUserDto, lang: string) {
    try {
      const user = await this.userRepository.findByPk(updateUserDto.guid);
      if (!user) return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('user.notFound', { lang }));
      if (updateUserDto.isExternalUser === false && updateUserDto.employee_guid) {
        const employee = await this.employeeRepository.findOne({ where: { guid: updateUserDto.employee_guid } });
        if (!employee) return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('user.employeeNotFound', { lang }));
        updateUserDto.phone_number = employee.phone_number;
      }
      if (updateUserDto.password) updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
      await user.update(updateUserDto);
      await user.reload({ include: [{ model: Employee }] });
      const plainUser = user.get({ plain: true });
      const { password, refresh_token, ...userResponse } = plainUser;
      return successResponse(HttpStatuses.OK, userResponse, this.i18n.t('user.updated', { lang }));
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('user.updateFailed', { lang }), error);
    }
  }

  async deleteUser(guid: string, lang: string) {
    try {
      const user = await this.userRepository.findByPk(guid);
      if (!user) return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('user.notFound', { lang }));
      await user.destroy();
      return successResponse(HttpStatuses.OK, null, this.i18n.t('user.deleted', { lang }));
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('user.deleteFailed', { lang }), error);
    }
  }
}
