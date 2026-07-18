import { Injectable } from '@nestjs/common';
import { CreateTranslatorDto } from './dto/create-translator.dto';
import { UpdateTranslatorDto } from './dto/update-translator.dto';
import { InjectModel } from '@nestjs/sequelize';
import { Translator } from './entities/translator.entity';
import { errorResponse, successResponse } from '../../helpers/responseFunctions';
import { HttpStatuses } from '../../helpers/httpStatuses.enum';

@Injectable()
export class TranslatorService {
  constructor(
    @InjectModel(Translator) private translatorRepository: typeof Translator,
  ) { }
  async addTranslator(createDto: CreateTranslatorDto) {
    try {
      const translator = await this.translatorRepository.create({
        ...createDto
      } as any);
      return successResponse(HttpStatuses.CREATED, translator, 'Translator created successfully');
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Translator creation failed', error);
    }
  }

  async getAllTranslators() {
    try {
      const translators = await this.translatorRepository.findAll({ order: [['createdAt', 'ASC']] });
      return successResponse(HttpStatuses.OK, translators, 'Translators fetched successfully');
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Translators fetched error', error);
    }
  }

  async updateTranslator(updateDto: UpdateTranslatorDto) {
    try {
      const translator = await this.translatorRepository.findOne({ where: { guid: updateDto.guid } });
      if (!translator) return errorResponse(HttpStatuses.NOT_FOUND, 'Translator not found');

      await this.translatorRepository.update(updateDto as any, { where: { guid: updateDto.guid } });

      const updated = await this.translatorRepository.findOne({ where: { guid: updateDto.guid } });
      return successResponse(HttpStatuses.OK, updated, 'Translator updated successfully');
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Update error', error);
    }
  }

  async deleteTranslator(guid: string) {
    try {
      const deletedCount = await this.translatorRepository.destroy({ where: { guid } });
      if (deletedCount === 0) return errorResponse(HttpStatuses.NOT_FOUND, 'Translator not found');

      return successResponse(HttpStatuses.OK, null, 'Translator deleted successfully');
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Delete error', error);
    }
  }
}