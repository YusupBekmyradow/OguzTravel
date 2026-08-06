import { Injectable } from '@nestjs/common';
import { CreatePositionDto } from './dto/create-position.dto';
import { UpdatePositionDto } from './dto/update-position.dto';
import { InjectModel } from '@nestjs/sequelize';
import { Position } from './entities/position.entity';
import { errorResponse, successResponse } from '../../helpers/responseFunctions';
import { HttpStatuses } from '../../helpers/httpStatuses.enum';
import { I18nService } from 'nestjs-i18n';

@Injectable()
export class PositionService {
  constructor(
    @InjectModel(Position) private positionRepository: typeof Position,
    private readonly i18n: I18nService,
  ) { }

  async addPosition(createPositionDto: CreatePositionDto, lang: string) {
    try {
      const position = await this.positionRepository.create({ ...createPositionDto } as any);
      return successResponse(HttpStatuses.CREATED, position, this.i18n.t('position.created', { lang }));
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('position.createFailed', { lang }), error);
    }
  }

  async getAllPosition(lang: string = 'tk') {
    try {
      const positions = await this.positionRepository.findAll({ order: [['createdAt', 'DESC']] });
      return successResponse(HttpStatuses.OK, positions, this.i18n.t('position.listFetched', { lang }));
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('position.fetchFailed', { lang }));
    }
  }

  async updatePosition(updatePositionDto: UpdatePositionDto, lang: string) {
    try {
      const position = await this.positionRepository.findOne({ where: { guid: updatePositionDto.guid } });
      if (!position) return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('position.notFound', { lang }));
      await this.positionRepository.update(updatePositionDto as any, { where: { guid: updatePositionDto.guid } });
      const updatedPosition = await this.positionRepository.findOne({ where: { guid: updatePositionDto.guid } });
      return successResponse(HttpStatuses.OK, updatedPosition, this.i18n.t('position.updated', { lang }));
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('position.updateFailed', { lang }), error);
    }
  }

  async deletePosition(guid: string, lang: string) {
    try {
      const deletedCount = await this.positionRepository.destroy({ where: { guid } });
      if (deletedCount === 0) return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('position.notFound', { lang }));
      return successResponse(HttpStatuses.OK, null, this.i18n.t('position.deleted', { lang }));
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('position.deleteFailed', { lang }), error);
    }
  }
}
