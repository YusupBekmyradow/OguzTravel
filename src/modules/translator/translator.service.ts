import { Injectable } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
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
    private readonly i18n: I18nService,
  ) { }
  async addTranslator(createDto: CreateTranslatorDto, lang: string) {
    try {
      const translator = await this.translatorRepository.create({
        ...createDto
      } as any);
      return successResponse(HttpStatuses.CREATED, translator, this.i18n.t('translator.created', { lang }));
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('translator.createFailed', { lang }), error);
    }
  }

  async getAllTranslators(lang: string = 'tk') {
    try {
      const translators = await this.translatorRepository.findAll({ order: [['createdAt', 'ASC']] });
      return successResponse(HttpStatuses.OK, translators, this.i18n.t('translator.listFetched', { lang }));
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('translator.fetchFailed', { lang }), error);
    }
  }

  async updateTranslator(updateDto: UpdateTranslatorDto, lang: string) {
    try {
      const translator = await this.translatorRepository.findOne({ where: { guid: updateDto.guid } });
      if (!translator) return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('translator.notFound', { lang }));

      await this.translatorRepository.update(updateDto as any, { where: { guid: updateDto.guid } });

      const updated = await this.translatorRepository.findOne({ where: { guid: updateDto.guid } });
      return successResponse(HttpStatuses.OK, updated, this.i18n.t('translator.updated', { lang }));
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('translator.updateFailed', { lang }), error);
    }
  }

  async deleteTranslator(guid: string, lang: string) {
    try {
      const deletedCount = await this.translatorRepository.destroy({ where: { guid } });
      if (deletedCount === 0) return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('translator.notFound', { lang }));

      return successResponse(HttpStatuses.OK, null, this.i18n.t('translator.deleted', { lang }));
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('translator.deleteFailed', { lang }), error);
    }
  }
}




