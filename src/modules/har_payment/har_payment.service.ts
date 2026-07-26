import { Injectable } from '@nestjs/common';
import { CreateHarPaymentDto } from './dto/create-har_payment.dto';
import { UpdateHarPaymentDto } from './dto/update-har_payment.dto';
import { InjectModel } from '@nestjs/sequelize';
import { HarPayment } from './entities/har_payment.entity';
import { Sequelize } from 'sequelize-typescript';
import { Employee } from '../employee/entities/employee.entity';
import { errorResponse, successResponse } from '../../helpers/responseFunctions';
import { HttpStatuses } from '../../helpers/httpStatuses.enum';
import { QueryTypes } from 'sequelize';
import { Op } from 'sequelize';

@Injectable()
export class HarPaymentService {
  constructor(
    @InjectModel(HarPayment) private harPaymentRepo: typeof HarPayment,
    private sequelize: Sequelize,
  ) { }

  async addHarPayment(createDto: CreateHarPaymentDto) {
    try {
      const payment = await this.harPaymentRepo.create({ ...createDto } as any);

      const createdPayment = await this.harPaymentRepo.findByPk(payment.guid, {
        include: [{ model: Employee, as: 'operator', attributes: ['guid', 'fullName'] }]
      });
      if (!createdPayment) {
        return errorResponse(HttpStatuses.NOT_FOUND, 'Payment not found');
      }

      const target = this.getTargetInfo(createDto);
      if (!target) {
        return errorResponse(HttpStatuses.BAD_REQUEST, 'A valid reference guid must be provided');
      }

      const stats = await this.getHarPaymentStats(target);
      return successResponse(HttpStatuses.CREATED, { ...createdPayment.toJSON(), stats }, 'Payment created successfully');
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Payment creation failed', error);
    }
  }


  async getAllHarPayments(page: number, limit: number, filters: { hotel_guid?: string, airway_guid?: string, railway_guid?: string }) {
    try {
      const currentPage = Math.max(1, Number(page));
      const currentLimit = Math.max(1, Number(limit));
      const offset = (currentPage - 1) * currentLimit;

      const where: any = {};
      let target: any = null;

      if (filters.hotel_guid) {
        where.hotel_guid = filters.hotel_guid;
        target = { guid: filters.hotel_guid, table: 'tbl_hotel', col: 'hotel_guid' };
      } else if (filters.airway_guid) {
        where.airway_guid = filters.airway_guid;
        target = { guid: filters.airway_guid, table: 'tbl_airway', col: 'airway_guid' };
      } else if (filters.railway_guid) {
        where.railway_guid = filters.railway_guid;
        target = { guid: filters.railway_guid, table: 'tbl_railway', col: 'railway_guid' };
      } else {
        return errorResponse(HttpStatuses.BAD_REQUEST, 'At least one guid is required');
      }
      const { rows, count } = await this.harPaymentRepo.findAndCountAll({
        where,
        include: [{ model: Employee, as: 'operator', attributes: ['guid', 'fullName'] }],
        order: [['index_number', 'DESC']],
        limit: currentLimit,
        offset: offset,
      });

      const stats = await this.getHarPaymentStats(target);

      return successResponse(HttpStatuses.OK, {
        data: rows,
        stats,
        meta: { totalItems: count, totalPages: Math.ceil(count / currentLimit), currentPage }
      }, 'Payments fetched successfully');
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Fetching error', error);
    }
  }



  async updateHarPayment(updateDto: UpdateHarPaymentDto) {
    try {
      const payment = await this.harPaymentRepo.findOne({ where: { guid: updateDto.guid } });
      if (!payment) return errorResponse(HttpStatuses.NOT_FOUND, 'Payment not found');

      await this.harPaymentRepo.update(updateDto as any, { where: { guid: updateDto.guid } });
      const updated = await this.harPaymentRepo.findOne({
        where: { guid: updateDto.guid },
        include: [{ model: Employee, as: 'operator', attributes: ['guid', 'fullName'] }]
      });

      if (!updated) return errorResponse(HttpStatuses.NOT_FOUND, 'Updated record not found');

      const target = this.getTargetInfo(updated);
      if (!target) return errorResponse(HttpStatuses.BAD_REQUEST, 'Target reference missing');

      const stats = await this.getHarPaymentStats(target);
      return successResponse(HttpStatuses.OK, { ...updated.toJSON(), stats }, 'Payment updated successfully');
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Update error', error);
    }
  }


  async deleteHarPayment(guid: string) {
    try {
      const payment = await this.harPaymentRepo.findOne({ where: { guid } });
      if (!payment) return errorResponse(HttpStatuses.NOT_FOUND, 'Payment not found');

      const target = this.getTargetInfo(payment);
      await this.harPaymentRepo.destroy({ where: { guid } });

      if (!target) return successResponse(HttpStatuses.OK, null, 'Payment deleted successfully');

      const stats = await this.getHarPaymentStats(target);
      return successResponse(HttpStatuses.OK, stats, 'Payment deleted successfully');
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Delete error', error);
    }
  }


  private getTargetInfo(data: any) {
    if (data.hotel_guid) return { guid: data.hotel_guid, table: 'tbl_hotel', col: 'hotel_guid' };
    if (data.airway_guid) return { guid: data.airway_guid, table: 'tbl_airway', col: 'airway_guid' };
    if (data.railway_guid) return { guid: data.railway_guid, table: 'tbl_railway', col: 'railway_guid' };
    return null;
  }

  private async getHarPaymentStats(target: { guid: string, table: string, col: string }) {
    const stats = await this.sequelize.query(`
      SELECT 
        target.guid as "target_guid",
        target.price as "total_price",
        COALESCE(SUM(hp.amount), 0) as "paid_amount"
      FROM ${target.table} target
      LEFT JOIN "tbl_HAR_payments" hp ON hp.${target.col} = target.guid
      WHERE target.guid = :guid
      GROUP BY target.guid, target.price
    `, {
      replacements: { guid: target.guid },
      type: QueryTypes.SELECT
    });

    const row = (stats[0] as any) || { total_price: 0, paid_amount: 0 };
    const total = Number(row.total_price);
    const paid = Number(row.paid_amount);

    return {
      total_sales: total,
      total_paid: paid,
      remaining: total - paid
    };
  }
}