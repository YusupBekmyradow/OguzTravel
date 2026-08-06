import { Injectable } from '@nestjs/common';
import { CreateOfficeDto } from './dto/create-office.dto';
import { UpdateOfficeDto } from './dto/update-office.dto';
import { InjectModel } from '@nestjs/sequelize';
import { Office } from './entities/office.entity';
import { errorResponse, successResponse } from '../../helpers/responseFunctions';
import { HttpStatuses } from '../../helpers/httpStatuses.enum';
import { I18nService } from 'nestjs-i18n';

@Injectable()
export class OfficeService {
  constructor(
    @InjectModel(Office) private officeRepository: typeof Office,
    private readonly i18n: I18nService,
  ) { }

  async addOffice(createOfficeDto: CreateOfficeDto, lang: string) {
    try {
      const office = await this.officeRepository.create({ ...createOfficeDto } as any);
      return successResponse(HttpStatuses.CREATED, office, this.i18n.t('office.created', { lang }));
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('office.createFailed', { lang }), error);
    }
  }

  async getAllOffice(lang: string = 'tk') {
    try {
      const offices = await this.officeRepository.findAll({ order: [['createdAt', 'DESC']] });
      return successResponse(HttpStatuses.OK, offices, this.i18n.t('office.listFetched', { lang }));
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('office.fetchFailed', { lang }), error);
    }
  }

  async updateOffice(updateOfficeDto: UpdateOfficeDto, lang: string) {
    try {
      const office = await this.officeRepository.findOne({ where: { guid: updateOfficeDto.guid } });
      if (!office) return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('office.notFound', { lang }));
      await this.officeRepository.update(updateOfficeDto as any, { where: { guid: updateOfficeDto.guid } });
      const updatedOffice = await this.officeRepository.findOne({ where: { guid: updateOfficeDto.guid } });
      return successResponse(HttpStatuses.OK, updatedOffice, this.i18n.t('office.updated', { lang }));
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('office.updateFailed', { lang }), error);
    }
  }

  async deleteOffice(guid: string, lang: string) {
    try {
      const deletedCount = await this.officeRepository.destroy({ where: { guid } });
      if (deletedCount === 0) return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('office.notFound', { lang }));
      return successResponse(HttpStatuses.OK, null, this.i18n.t('office.deleted', { lang }));
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('office.deleteFailed', { lang }), error);
    }
  }
}
