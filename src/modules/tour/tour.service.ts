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
import { Sequelize } from 'sequelize-typescript';
import { TtpPayment } from '../ttp_payment/entities/ttp_payment.entity';

@Injectable()
export class TourService {
  constructor(
    @InjectModel(Tour) private tourRepository: typeof Tour,
    @InjectModel(TtpPayment) private ttpPaymentRepo: typeof TtpPayment,
    private sequelize: Sequelize,
  ) { }

  private getIncludes() {
    return [
      {
        model: Employee, as: 'operator', attributes: ['guid', 'fullName'],
        include: [{ model: Office, attributes: ['guid', 'fullName', 'shortName'] }]
      },
      { model: Client, attributes: ['guid', 'fullName'] },
      {
        model: Employee, as: 'preparedOpr', attributes: ['guid', 'fullName'],
        include: [{ model: Office, attributes: ['guid', 'fullName', 'shortName'] }]
      },
    ];
  }

  private getAttributes() {
    return {
      include: [
        [
          Sequelize.literal(`(
            SELECT ROUND(COALESCE(SUM(amount), 0)::numeric, 2)
            FROM "tbl_TTP_payments" AS tp
            WHERE tp.tour_guid = "Tour"."guid"
          )`),
          'totalPaid'
        ],
        [
          Sequelize.literal(`(
            SELECT 
              CASE 
                WHEN SUM(tp.amount) IS NULL OR SUM(tp.amount) = 0 THEN '0%'
                WHEN "Tour".price > 0 
                THEN CONCAT(ROUND(((SUM(tp.amount) / "Tour".price) * 100)::numeric, 2), '%')
                ELSE '100%' 
              END
            FROM "tbl_TTP_payments" AS tp
            WHERE tp.tour_guid = "Tour"."guid"
          )`),
          'paidPercentage'
        ]
      ]
    };
  }

  async addTour(createDto: CreateTourDto) {
    const t = await this.sequelize.transaction();
    try {
      const tour = await this.tourRepository.create({ ...createDto } as any, { hooks: true, transaction: t });
      if (createDto.is_paid === true) {
        await this.ttpPaymentRepo.create({
          tour_guid: tour.guid,
          amount: tour.price || 0,
          payment_date: new Date(),
          opr_guid: createDto.opr_guid
        } as any, { transaction: t });
      }

      await t.commit();

      const newTour = await this.tourRepository.findOne({
        where: { guid: tour.guid },
        attributes: {
          exclude: ['opr_guid', 'client_guid', 'prepared_opr_guid'],
          include: this.getAttributes().include as any
        },
        include: this.getIncludes()
      });
      return { status: 201, data: newTour, message: 'Tour created successfully' };
    } catch (error: any) {
      await t.rollback();
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Tour creation failed', error);
    }
  }

  async getAllTour(page: number = 1, limit: number = 10) {
    try {
      const currentPage = Math.max(1, Number(page));
      const currentLimit = Math.max(1, Number(limit));
      const offset = (currentPage - 1) * currentLimit;

      const { rows, count } = await this.tourRepository.findAndCountAll({
        attributes: {
          exclude: ['opr_guid', 'client_guid', 'prepared_opr_guid'],
          include: this.getAttributes().include as any
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
        attributes: {
          exclude: ['opr_guid', 'client_guid', 'prepared_opr_guid'],
          include: this.getAttributes().include as any
        },
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