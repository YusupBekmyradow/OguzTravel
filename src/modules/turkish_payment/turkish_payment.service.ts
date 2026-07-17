import { Injectable } from '@nestjs/common';
import { CreateTurkishPaymentDto } from './dto/create-turkish_payment.dto';
import { UpdateTurkishPaymentDto } from './dto/update-turkish_payment.dto';
import { TurkishPayment } from './entities/turkish_payment.entity';
import { InjectModel } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { HttpStatuses } from '../../helpers/httpStatuses.enum';
import { errorResponse, successResponse } from '../../helpers/responseFunctions';
import { QueryTypes } from 'sequelize';
import { Employee } from '../employee/entities/employee.entity';

@Injectable()
export class TurkishPaymentService {
  constructor(
    @InjectModel(TurkishPayment) private turkishPaymentRepo: typeof TurkishPayment,
    private sequelize: Sequelize,
  ) { }

  async addturkishPayment(createDto: CreateTurkishPaymentDto) {
    try {
      const payment = await this.turkishPaymentRepo.create({
        ...createDto,
      } as any);

      const createdPayment = await this.turkishPaymentRepo.findByPk(payment.guid, {
        include: [{ model: Employee, as: 'operator', attributes: ['guid', 'fullName'] }]
      });

      if (!createdPayment) {
        return errorResponse(HttpStatuses.NOT_FOUND, 'Payment not found');
      }
      const statsResult = await this.getPaymentStats(createDto.turkish_airline_guid);

      const combinedData = {
        ...createdPayment.toJSON(),
        ...statsResult
      };
      return successResponse(HttpStatuses.CREATED, combinedData, 'TurkishPayment created successfully');
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'TurkishPayment creation failed', error);
    }
  }


  async getAllturkishPayment(page: number = 1, limit: number = 10, turkish_airline_guid: string) {
    try {
      const currentPage = Math.max(1, Number(page));
      const currentLimit = Math.max(1, Number(limit));
      const offset = (currentPage - 1) * currentLimit;

      const { rows, count } = await this.turkishPaymentRepo.findAndCountAll({
        where: { turkish_airline_guid },
        include: [
          {
            model: Employee,
            as: 'operator',
            attributes: ['guid', 'fullName']
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: Number(limit),
        offset: Number(offset),
      });

      const stats = await this.getPaymentStats(turkish_airline_guid);

      return {
        status: 200,
        data: rows,
        stats: stats,
        meta: {
          totalItems: count,
          totalPages: Math.ceil(count / currentLimit),
          currentPage: currentPage
        },
        message: 'TurkishPayment fetched successfully'
      };
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'TurkishPayment fetching error', error);
    }
  }


  async updateturkishPayment(updateDto: UpdateTurkishPaymentDto) {
    try {
      const payment = await this.turkishPaymentRepo.findOne({ where: { guid: updateDto.guid } });
      if (!payment) return errorResponse(HttpStatuses.NOT_FOUND, 'TurkishPayment not found');

      await this.turkishPaymentRepo.update(updateDto as any, { where: { guid: updateDto.guid } });

      const updatedPayment = await this.turkishPaymentRepo.findOne({
        where: { guid: updateDto.guid },
        include: [{ model: Employee, as: 'operator', attributes: ['guid', 'fullName'] }]
      });
      if (!updatedPayment) {
        return errorResponse(HttpStatuses.NOT_FOUND, 'Updated record not found');
      }
      if (updatedPayment) {
        const stats = await this.getPaymentStats(updatedPayment.turkish_airline_guid);
        const combinedData = {
          ...updatedPayment.toJSON(),
          ...stats
        };
        return successResponse(HttpStatuses.OK, combinedData, 'TurkishPayment updated successfully');
      }
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Update error', error);
    }
  }

  async deleteturkishPayment(guid: string) {
    try {
      const payment = await this.turkishPaymentRepo.findOne({ where: { guid } });
      if (!payment) return errorResponse(HttpStatuses.NOT_FOUND, 'TurkishPayment not found');

      const turkish_airline_guid = payment.turkish_airline_guid;
      await this.turkishPaymentRepo.destroy({ where: { guid } });

      const stats = await this.getPaymentStats(turkish_airline_guid);
      return successResponse(HttpStatuses.OK, stats, 'TurkishPayment deleted successfully');
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Delete error', error);
    }
  }

  private async getPaymentStats(turkish_airline_guid: string) {

    const stats = await this.sequelize.query(`
      SELECT 
        b.guid as "turkish_airline_guid",
        b.quoted_price as "total_sales",
        COALESCE(SUM(tp.amount), 0) as "total_paid",
        (b.quoted_price - COALESCE(SUM(tp.amount), 0)) as "remaining"
      FROM tbl_turkish_airlines b
      LEFT JOIN tbl_turkish_payments tp ON b.guid = tp.turkish_airline_guid
      WHERE b.guid = :turkish_airline_guid
      GROUP BY b.guid, b.quoted_price
    `, {
      replacements: { turkish_airline_guid },
      type: QueryTypes.SELECT
    });

    return stats[0] || {
      turkish_airline_guid,
      total_sales: 0,
      total_paid: 0,
      remaining: 0,
    };
  }
}