import { Injectable } from '@nestjs/common';
import { CreatePositionDto } from './dto/create-position.dto';
import { UpdatePositionDto } from './dto/update-position.dto';
import { InjectModel } from '@nestjs/sequelize';
import { Position } from './entities/position.entity';
import { errorResponse, successResponse } from '../../helpers/responseFunctions';
import { HttpStatuses } from '../../helpers/httpStatuses.enum';

@Injectable()
export class PositionService {
  constructor(
    @InjectModel(Position)
    private positionRepository: typeof Position,
  ) { }

  async addPosition(createPositionDto: CreatePositionDto) {
    try {
      const position = await this.positionRepository.create({
        ...createPositionDto
      } as any)
      return successResponse(HttpStatuses.CREATED, position, 'Position created successfully');
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Position creation failed', error)
    }
  }


  async getAllPosition() {
    try {
      const postions = await this.positionRepository.findAll({order: [['createdAt', 'DESC']]});
      return successResponse(HttpStatuses.OK, postions, 'Positions fetched successfully');
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Positions fetched error')
    }
  }


  async updatePosition(updatePositionDto: UpdatePositionDto) {
    try {
      const position = await this.positionRepository.findOne({ where: { guid: updatePositionDto.guid } });
      if (!position) return errorResponse(HttpStatuses.NOT_FOUND, 'Position not found');

      await this.positionRepository.update(updatePositionDto as any, { where: { guid: updatePositionDto.guid } });

      const updatedPosition = await this.positionRepository.findOne({ where: {  guid: updatePositionDto.guid } });

      return successResponse(HttpStatuses.OK, updatedPosition, 'Position updated successfully');
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Update error', error);
    }
  }


 async deletePosition(guid: string) {
    try {
      const deletedCount = await this.positionRepository.destroy({
        where: { guid } 
      });

      if (deletedCount === 0) {
        return errorResponse(HttpStatuses.NOT_FOUND, 'Position not found');
      }

      return successResponse(HttpStatuses.OK,  null, 'Position deleted successfully');
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Delete error', error);
    }
  }
}
