import { Injectable } from '@nestjs/common';
import { CreateHotelDto } from './dto/create-hotel.dto';
import { UpdateHotelDto } from './dto/update-hotel.dto';
import { InjectModel } from '@nestjs/sequelize';
import { Hotel } from './entities/hotel.entity';
import { Employee } from '../employee/entities/employee.entity';
import { Client } from '../client/entities/client.entity';
import { errorResponse, successResponse } from '../../helpers/responseFunctions';
import { HttpStatuses } from '../../helpers/httpStatuses.enum';
import { Office } from '../office/entities/office.entity';

@Injectable()
export class HotelService {
  constructor(
    @InjectModel(Hotel) private hotelRepository: typeof Hotel
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

  async addHotel(createDto: CreateHotelDto) {
    try {
      const hotel = await this.hotelRepository.create({ ...createDto } as any, { hooks: true });

      const newHotel = await this.hotelRepository.findOne({
        where: { guid: hotel.guid },
        attributes: {
          exclude: ['opr_guid', 'client_guid', 'prepared_opr_guid']
        },
        include: this.getIncludes()
      });

      return { status: 201, data: newHotel, message: 'Hotel created successfully' };
    } catch (error: any) {
      console.log(error)
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Hotel creation failed', error);
    }
  }

  async getAllHotel(page: number = 1, limit: number = 10) {
    try {
      const currentPage = Math.max(1, Number(page));
      const currentLimit = Math.max(1, Number(limit));
      const offset = (currentPage - 1) * currentLimit;

      const { rows, count } = await this.hotelRepository.findAndCountAll({
        attributes: {
          exclude: ['opr_guid', 'client_guid', 'prepared_opr_guid']
        },
        include: this.getIncludes(),
        order: [['index_number', 'DESC']],
        limit: currentLimit,
        offset: offset,
      });

      return {
        status: 200,
        data: rows,
        meta: { totalItems: count, totalPages: Math.ceil(count / currentLimit), currentPage },
        message: 'Hotels fetched successfully'
      };
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Hotel fetching error', error);
    }
  }

  async updateHotel(updateDto: UpdateHotelDto) {
    try {
      const hotel = await this.hotelRepository.findOne({
        where: { guid: updateDto.guid }
      });
      if (!hotel) {
        return errorResponse(HttpStatuses.NOT_FOUND, 'Hotel not found');
      }

      await hotel.update(updateDto);

      const updatedHotel = await this.hotelRepository.findOne({
        where: { guid: updateDto.guid },
        attributes: {
          exclude: ['opr_guid', 'client_guid', 'prepared_opr_guid']
        },
        include: this.getIncludes()
      });

      return { status: 200, data: updatedHotel, message: 'Hotel updated successfully' };
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Update failed', error);
    }
  }

  async deleteHotel(guid: string) {
    try {
      const hotel = await this.hotelRepository.findByPk(guid);
      if (!hotel) return errorResponse(HttpStatuses.NOT_FOUND, 'Hotel not found');

      await hotel.destroy();
      return successResponse(HttpStatuses.OK, null, 'Hotel deleted successfully');
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Deletion failed', error);
    }
  }
}