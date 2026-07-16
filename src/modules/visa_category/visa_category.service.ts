import { Injectable } from '@nestjs/common';
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
  ) { }

  async addVisaCategory(createDto: CreateVisaCategoryDto) {
    try {
      const category = await this.visaCategoryRepository.create({ ...createDto } as any);
      return successResponse(HttpStatuses.CREATED, category, 'Visa category created successfully');
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Visa category creation failed', error);
    }
  }

  async getAllVisaCategories() {
    try {
      const categories = await this.visaCategoryRepository.findAll({ order: [['createdAt', 'DESC']] });
      return successResponse(HttpStatuses.OK, categories, 'Visa categories fetched successfully');
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Visa categories fetch error');
    }
  }

  async updateVisaCategory(updateDto: UpdateVisaCategoryDto) {
    try {
      const category = await this.visaCategoryRepository.findOne({ where: { guid: updateDto.guid } });
      if (!category) return errorResponse(HttpStatuses.NOT_FOUND, 'Visa category not found');

      await this.visaCategoryRepository.update(updateDto as any, { where: { guid: updateDto.guid } });
      const updated = await this.visaCategoryRepository.findOne({ where: { guid: updateDto.guid } });

      return successResponse(HttpStatuses.OK, updated, 'Visa category updated successfully');
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Update error', error);
    }
  }

  async deleteVisaCategory(guid: string) {
    try {
      const deletedCount = await this.visaCategoryRepository.destroy({ where: { guid } });
      if (deletedCount === 0) return errorResponse(HttpStatuses.NOT_FOUND, 'Visa category not found');
      
      return successResponse(HttpStatuses.OK, null, 'Visa category deleted successfully');
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Delete error', error);
    }
  }
}