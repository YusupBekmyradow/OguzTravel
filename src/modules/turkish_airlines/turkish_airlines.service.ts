import { Injectable } from '@nestjs/common';
import { CreateTurkishAirlineDto } from './dto/create-turkish_airline.dto';
import { UpdateTurkishAirlineDto } from './dto/update-turkish_airline.dto';
import { InjectModel } from '@nestjs/sequelize';
import { TurkishAirline } from './entities/turkish_airline.entity';
import { errorResponse, successResponse } from '../../helpers/responseFunctions';
import { HttpStatuses } from '../../helpers/httpStatuses.enum';
import { Employee } from '../employee/entities/employee.entity';
import { Office } from '../office/entities/office.entity';
import { Client } from '../client/entities/client.entity';
import { Tstatus } from '../tstatus/entities/tstatus.entity';
import { Sequelize } from 'sequelize-typescript';

@Injectable()
export class TurkishAirlinesService {
  constructor(
    @InjectModel(TurkishAirline) private turkishAirlineRepo: typeof TurkishAirline
  ) { }

  private getTurkishAirlineIncludes() {
    return [
      {
        model: Employee, as: 'ta_assignment_operator', attributes: ['guid', 'fullName'],
        include: [{ model: Office, attributes: ['guid', 'fullName', 'shortName'] }]
      },
      {
        model: Employee, as: 'ta_receiver_operator', attributes: ['guid', 'fullName'],
        include: [{ model: Office, attributes: ['guid', 'fullName', 'shortName'] }]
      },
      { model: Client },
      { model: Tstatus, attributes: ['guid', 'name'] },
      { model: Office, attributes: ['guid', 'fullName', 'shortName'] }
    ];
  }

  private getTurkishAttributes() {
    return [
      [
        Sequelize.literal(`(
        SELECT ROUND(COALESCE(SUM(tp.amount), 0)::numeric, 2)
        FROM "tbl_turkish_payments" AS tp
        WHERE tp.turkish_airline_guid = "TurkishAirline"."guid"
      )`),
        'totalPaid'
      ],
      [
        Sequelize.literal(`(
        SELECT 
          CASE 
            WHEN SUM(tp.amount) IS NULL OR SUM(tp.amount) = 0 THEN '0%'
            WHEN "TurkishAirline".total_price > 0 
            THEN CONCAT(ROUND(((SUM(tp.amount) / "TurkishAirline".total_price) * 100)::numeric, 2), '%')
            ELSE '100%'
          END
        FROM "tbl_turkish_payments" AS tp
        WHERE tp.turkish_airline_guid = "TurkishAirline"."guid"
      )`),
        'paidPercentage'
      ]
    ];
  }

  async addTurkishAirline(createTurkishAirlineDto: CreateTurkishAirlineDto) {
    try {
      const turkishAirline = await this.turkishAirlineRepo.create(
        { ...createTurkishAirlineDto } as any,
        { hooks: true }
      );
      const newTurkishAirline = await this.turkishAirlineRepo.findOne({
        where: { guid: turkishAirline.guid },
        include: this.getTurkishAirlineIncludes(),
        attributes: { include: this.getTurkishAttributes() as any }
      });

      if (!newTurkishAirline) {
        return errorResponse(HttpStatuses.NOT_FOUND, 'TurkishAirline not found');
      }

      return {
        status: 201,
        data: newTurkishAirline,
        message: 'TurkishAirline created successfully'
      };
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Creation failed', error);
    }
  }


  async getAllTurkishAirline(page: number = 1, limit: number = 10) {
    try {
      const currentPage = Math.max(1, Number(page));
      const currentLimit = Math.max(1, Number(limit));
      const offset = (currentPage - 1) * currentLimit;

      const { rows, count } = await this.turkishAirlineRepo.findAndCountAll({
        include: this.getTurkishAirlineIncludes(),
        attributes: { include: this.getTurkishAttributes() as any },
        order: [['index_number', 'DESC']],
        limit: Number(limit),
        offset: Number(offset),
      });

      return {
        status: 200,
        data: rows,
        meta: {
          totalItems: count,
          totalPages: Math.ceil(count / limit),
          currentPage: currentPage
        },
        message: 'TurkishAirline fetched successfully'
      };
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'TurkishAirline fetching error', error);
    }
  }


  async updateTurkishAirline(updateDto: UpdateTurkishAirlineDto) {
    try {
      const turkishAirline = await this.turkishAirlineRepo.findByPk(updateDto.guid);
      if (!turkishAirline) return errorResponse(HttpStatuses.NOT_FOUND, 'TurkishAirline not found');

      await turkishAirline.update(updateDto);

      const updatedTurkishAirline = await this.turkishAirlineRepo.findOne({
        where: { guid: updateDto.guid },
        include: this.getTurkishAirlineIncludes(),
        attributes: { include: this.getTurkishAttributes() as any }
      });

      return { status: 200, data: updatedTurkishAirline, message: 'TurkishAirline updated successfully' };
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Update failed', error);
    }
  }

  async deleteTurkishAirline(guid: string) {
    try {
      const turkishAirline = await this.turkishAirlineRepo.findByPk(guid);
      if (!turkishAirline) {
        return errorResponse(HttpStatuses.NOT_FOUND, 'TurkishAirline not found');
      }
      await turkishAirline.destroy();

      return successResponse(HttpStatuses.OK, null, 'TurkishAirline deleted successfully');
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Deletion failed', error)
    }
  }
}
