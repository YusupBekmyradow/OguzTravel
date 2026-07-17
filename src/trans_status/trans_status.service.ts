import { Injectable } from '@nestjs/common';
import { CreateTransStatusDto } from './dto/create-trans_status.dto';
import { UpdateTransStatusDto } from './dto/update-trans_status.dto';
import { TransStatus } from './entities/trans_status.entity';
import { InjectModel } from '@nestjs/sequelize';
import { errorResponse, successResponse } from '../helpers/responseFunctions';
import { HttpStatuses } from '../helpers/httpStatuses.enum';

@Injectable()
export class TransStatusService {
  constructor(
    @InjectModel(TransStatus) private transStatusRepository: typeof TransStatus,
  ) { }

  async addTransStatus(createDto: CreateTransStatusDto) {
    try {
      const status = await this.transStatusRepository.create({
        ...createDto
      } as any);
      return successResponse(HttpStatuses.CREATED, status, 'TransStatus created successfully');
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'TransStatus creation failed', error);
    }
  }

  async getAllTransStatus() {
    try {
      const statuses = await this.transStatusRepository.findAll({ order: [['createdAt', 'ASC']] });
      return successResponse(HttpStatuses.OK, statuses, 'TransStatuses fetched successfully');
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'TransStatuses fetched error', error);
    }
  }

  async updateTransStatus(updateDto: UpdateTransStatusDto) {
    try {
      const status = await this.transStatusRepository.findOne({ where: { guid: updateDto.guid } });
      if (!status) return errorResponse(HttpStatuses.NOT_FOUND, 'TransStatus not found');

      await this.transStatusRepository.update(updateDto as any, { where: { guid: updateDto.guid } });

      const updatedStatus = await this.transStatusRepository.findOne({ where: { guid: updateDto.guid } });
      return successResponse(HttpStatuses.OK, updatedStatus, 'TransStatus updated successfully');
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Update error', error);
    }
  }

  async deleteTransStatus(guid: string) {
    try {
      const deletedCount = await this.transStatusRepository.destroy({
        where: { guid }
      });
      if (deletedCount === 0) {
        return errorResponse(HttpStatuses.NOT_FOUND, 'TransStatus not found');
      }
      return successResponse(HttpStatuses.OK, null, 'TransStatus deleted successfully');
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Delete error', error);
    }
  }
}
