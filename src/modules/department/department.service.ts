import { Injectable } from '@nestjs/common';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { InjectModel } from '@nestjs/sequelize';
import { Department } from './entities/department.entity';
import { errorResponse, successResponse } from '../../helpers/responseFunctions';
import { HttpStatuses } from '../../helpers/httpStatuses.enum';
import { I18nService } from 'nestjs-i18n';

@Injectable()
export class DepartmentService {
  constructor(
    @InjectModel(Department) private departmentRepository: typeof Department,
    private readonly i18n: I18nService,
  ) { }

  async addDepartment(createDepartmentDto: CreateDepartmentDto, lang: string) {
    try {
      const department = await this.departmentRepository.create({ ...createDepartmentDto } as any);
      return successResponse(HttpStatuses.CREATED, department, this.i18n.t('department.created', { lang }));
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('department.createFailed', { lang }), error);
    }
  }

  async getAllDepartment(lang: string = 'tk') {
    try {
      const departments = await this.departmentRepository.findAll({ order: [['createdAt', 'DESC']] });
      return successResponse(HttpStatuses.OK, departments, this.i18n.t('department.listFetched', { lang }));
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('department.fetchFailed', { lang }));
    }
  }

  async updateDepartment(updateDepartmentDto: UpdateDepartmentDto, lang: string) {
    try {
      const department = await this.departmentRepository.findOne({ where: { guid: updateDepartmentDto.guid } });
      if (!department) return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('department.notFound', { lang }));
      await this.departmentRepository.update(updateDepartmentDto as any, { where: { guid: updateDepartmentDto.guid } });
      const updatedDepartment = await this.departmentRepository.findOne({ where: { guid: updateDepartmentDto.guid } });
      return successResponse(HttpStatuses.OK, updatedDepartment, this.i18n.t('department.updated', { lang }));
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('department.updateFailed', { lang }), error);
    }
  }

  async deleteDepartment(guid: string, lang: string) {
    try {
      const deletedCount = await this.departmentRepository.destroy({ where: { guid } });
      if (deletedCount === 0) return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('department.notFound', { lang }));
      return successResponse(HttpStatuses.OK, null, this.i18n.t('department.deleted', { lang }));
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('department.deleteFailed', { lang }), error);
    }
  }
}
