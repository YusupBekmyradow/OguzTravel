import { Injectable } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { CreateTstatusDto } from './dto/create-tstatus.dto';
import { UpdateTstatusDto } from './dto/update-tstatus.dto';
import { InjectModel } from '@nestjs/sequelize';
import { Tstatus } from './entities/tstatus.entity';
import { errorResponse, successResponse } from '../../helpers/responseFunctions';
import { HttpStatuses } from '../../helpers/httpStatuses.enum';

@Injectable()
export class TstatusService {
  constructor(
    @InjectModel(Tstatus) private tstatusRepository: typeof Tstatus,
    private readonly i18n: I18nService,
  ) { }

  async addTstatus(createTstatusDto: CreateTstatusDto, lang: string) {
    try {
      const tstatus = await this.tstatusRepository.create({
        ...createTstatusDto
      } as any)
      return successResponse(HttpStatuses.CREATED, tstatus, this.i18n.t('tstatus.created', { lang }));
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('tstatus.createFailed', { lang }), error)
    }
  }


  async getAllTstatus(lang: string = 'tk') {
    try {
      const tstatus = await this.tstatusRepository.findAll({ order: [['createdAt', 'ASC']] });
      return successResponse(HttpStatuses.OK, tstatus, this.i18n.t('tstatus.listFetched', { lang }));
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('tstatus.fetchFailed', { lang }))
    }
  }


  async updateTstatus(updateTstatusDto: UpdateTstatusDto, lang: string) {
    try {
      const tstatus = await this.tstatusRepository.findOne({ where: { guid: updateTstatusDto.guid } });
      if (!tstatus) return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('tstatus.notFound', { lang }));

      await this.tstatusRepository.update(updateTstatusDto as any, { where: { guid: updateTstatusDto.guid } });

      const updatedTstatus = await this.tstatusRepository.findOne({ where: { guid: updateTstatusDto.guid } });

      return successResponse(HttpStatuses.OK, updatedTstatus, this.i18n.t('tstatus.updated', { lang }));
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('tstatus.updateFailed', { lang }), error);
    }
  }


  async deleteTstatus(guid: string, lang: string) {
    try {
      const deletedCount = await this.tstatusRepository.destroy({
        where: { guid }
      });

      if (deletedCount === 0) {
        return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('tstatus.notFound', { lang }));
      }

      return successResponse(HttpStatuses.OK, null, this.i18n.t('tstatus.deleted', { lang }));
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('tstatus.deleteFailed', { lang }), error);
    }
  }
}