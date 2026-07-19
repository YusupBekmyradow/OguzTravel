import { Injectable } from '@nestjs/common';
import { CreateTourDto } from './dto/create-tour.dto';
import { UpdateTourDto } from './dto/update-tour.dto';
import { InjectModel } from '@nestjs/sequelize';
import { Tour } from './entities/tour.entity';
import { Employee } from '../employee/entities/employee.entity';
import { Office } from '../office/entities/office.entity';
import { Client } from '../client/entities/client.entity';
import { errorResponse, successResponse } from '../../helpers/responseFunctions';
import { HttpStatuses } from '../../helpers/httpStatuses.enum';

@Injectable()
export class TourService {
  constructor(
    @InjectModel(Tour) private tourRepository: typeof Tour
  ) { }

  private getIncludes() {
    return [
      {
        model: Employee, as: 'operator', attributes: ['guid', 'fullName'],
        include: [{ model: Office, attributes: ['guid', 'fullName', 'shortName'] }]
      },
      { model: Client, attributes: ['guid', 'fullName'] },
      { model: Employee, as: 'preparedOpr', attributes: ['guid', 'fullName'] },
    ];
  }

  async addTour(createDto: CreateTourDto) {
    try {
      const tour = await this.tourRepository.create({ ...createDto } as any, { hooks: true });
      const newTour = await this.tourRepository.findOne({
        where: { guid: tour.guid },
        attributes: { exclude: ['opr_guid', 'client_guid', 'prepared_opr_guid'] },
        include: this.getIncludes()
      });
      return { status: 201, data: newTour, message: 'Tour created successfully' };
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Tour creation failed', error);
    }
  }

  async getAllTour(page: number = 1, limit: number = 10) {
    try {
      const currentPage = Math.max(1, Number(page));
      const currentLimit = Math.max(1, Number(limit));
      const offset = (currentPage - 1) * currentLimit;

      const { rows, count } = await this.tourRepository.findAndCountAll({
        attributes: { exclude: ['opr_guid', 'client_guid', 'prepared_opr_guid'] },
        include: this.getIncludes(),
        order: [['index_number', 'DESC']],
        limit: currentLimit,
        offset: offset,
      });
      return {
        status: 200,
        data: rows,
        meta: { totalItems: count, totalPages: Math.ceil(count / currentLimit), currentPage },
        message: 'Tour records fetched successfully'
      };
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Tour fetching error', error);
    }
  }

  async updateTour(updateDto: UpdateTourDto) {
    try {
      const tour = await this.tourRepository.findOne({
        where: { guid: updateDto.guid }
      });

      if (!tour) {
        return errorResponse(HttpStatuses.NOT_FOUND, 'Tour not found');
      }
      await tour.update(updateDto);
      const updatedTour = await this.tourRepository.findOne({
        where: { guid: updateDto.guid },
        attributes: { exclude: ['opr_guid', 'client_guid', 'prepared_opr_guid'] },
        include: this.getIncludes()
      });

      return { status: 200, data: updatedTour, message: 'Tour updated successfully' };
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Update failed', error);
    }
  }

  async deleteTour(guid: string) {
    try {
      const tour = await this.tourRepository.findByPk(guid);
      if (!tour) return errorResponse(HttpStatuses.NOT_FOUND, 'Tour not found');
      await tour.destroy();
      return successResponse(HttpStatuses.OK, null, 'Tour deleted successfully');
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Deletion failed', error);
    }
  }
}