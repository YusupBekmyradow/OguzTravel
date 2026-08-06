import { Injectable } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { CreateVisaCategoryDto } from './dto/create-visa_category.dto';
import { UpdateVisaCategoryDto } from './dto/update-visa_category.dto';
import { InjectModel } from '@nestjs/sequelize';
import { VisaCategory } from './entities/visa_category.entity';
import { errorResponse, successResponse } from '../../helpers/responseFunctions';
import { HttpStatuses } from '../../helpers/httpStatuses.enum';

@Injectable()
export class VisaCategoryService {
  constructor(
    @InjectModel(VisaCategory) private visaCategoryRepository: typeof VisaCategory,
    private readonly i18n: I18nService,
  ) { }

  async addVisaCategory(createDto: CreateVisaCategoryDto, lang: string) {
    try {
      const category = await this.visaCategoryRepository.create({ ...createDto } as any);
      return successResponse(HttpStatuses.CREATED, category, this.i18n.t('visa_category.created', { lang }));
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('visa_category.createFailed', { lang }), error);
    }
  }

  async getAllVisaCategories(lang: string = 'tk') {
    try {
      const categories = await this.visaCategoryRepository.findAll({ order: [['createdAt', 'DESC']] });
      return successResponse(HttpStatuses.OK, categories, this.i18n.t('visa_category.listFetched', { lang }));
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('visa_category.fetchFailed', { lang }));
    }
  }

  async updateVisaCategory(updateDto: UpdateVisaCategoryDto, lang: string) {
    try {
      const category = await this.visaCategoryRepository.findOne({ where: { guid: updateDto.guid } });
      if (!category) return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('visa_category.notFound', { lang }));

      await this.visaCategoryRepository.update(updateDto as any, { where: { guid: updateDto.guid } });
      const updated = await this.visaCategoryRepository.findOne({ where: { guid: updateDto.guid } });

      return successResponse(HttpStatuses.OK, updated, this.i18n.t('visa_category.updated', { lang }));
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('visa_category.updateFailed', { lang }), error);
    }
  }

  async deleteVisaCategory(guid: string, lang: string) {
    try {
      const deletedCount = await this.visaCategoryRepository.destroy({ where: { guid } });
      if (deletedCount === 0) return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('visa_category.notFound', { lang }));
      
      return successResponse(HttpStatuses.OK, null, this.i18n.t('visa_category.deleted', { lang }));
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('visa_category.deleteFailed', { lang }), error);
    }
  }
}




