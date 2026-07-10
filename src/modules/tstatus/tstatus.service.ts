import { Injectable } from '@nestjs/common';
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
  ) { }

  async addTstatus(createTstatusDto: CreateTstatusDto) {
    try {
      const tstatus = await this.tstatusRepository.create({
        ...createTstatusDto
      } as any)
      return successResponse(HttpStatuses.CREATED, tstatus, 'Tstatus created successfully');
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Tstatus creation failed', error)
    }
  }


  async getAllTstatus() {
    try {
      const tstatus = await this.tstatusRepository.findAll({ order: [['createdAt', 'ASC']] });
      return successResponse(HttpStatuses.OK, tstatus, 'Tstatuses fetched successfully');
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Tstatuses fetched error')
    }
  }


  async updateTstatus(updateTstatusDto: UpdateTstatusDto) {
    try {
      const tstatus = await this.tstatusRepository.findOne({ where: { guid: updateTstatusDto.guid } });
      if (!tstatus) return errorResponse(HttpStatuses.NOT_FOUND, 'Tstatus not found');

      await this.tstatusRepository.update(updateTstatusDto as any, { where: { guid: updateTstatusDto.guid } });

      const updatedTstatus = await this.tstatusRepository.findOne({ where: { guid: updateTstatusDto.guid } });

      return successResponse(HttpStatuses.OK, updatedTstatus, 'Tstatus updated successfully');
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Update error', error);
    }
  }


  async deleteTstatus(guid: string) {
    try {
      const deletedCount = await this.tstatusRepository.destroy({
        where: { guid }
      });

      if (deletedCount === 0) {
        return errorResponse(HttpStatuses.NOT_FOUND, 'Tstatus not found');
      }

      return successResponse(HttpStatuses.OK, null, 'Tstatus deleted successfully');
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Delete error', error);
    }
  }
}
