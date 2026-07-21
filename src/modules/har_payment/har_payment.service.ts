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

      const targetGuid = this.extractGuid(createDto);
      if (!targetGuid) {
        return errorResponse(HttpStatuses.BAD_REQUEST, 'A valid reference guid must be provided');
      }

      const stats = await this.getHarPaymentStats(targetGuid);
      return successResponse(HttpStatuses.CREATED, { ...createdPayment.toJSON(), stats }, 'Payment created successfully');
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Payment creation failed', error);
    }
  }

  async getAllHarPayments(page: number = 1, limit: number = 10, guid: string) {
    try {
      const currentPage = Math.max(1, Number(page));
      const currentLimit = Math.max(1, Number(limit));
      const offset = (currentPage - 1) * currentLimit;

      if (!guid) {
        return errorResponse(HttpStatuses.BAD_REQUEST, 'guid is required');
      }

      const { rows, count } = await this.harPaymentRepo.findAndCountAll({
        where: {
          [Op.or]: [
            { hotel_guid: guid },
            { airway_guid: guid },
            { railway_guid: guid }
          ]
        },
        include: [{ model: Employee, as: 'operator', attributes: ['guid', 'fullName'] }],
        order: [['index_number', 'DESC']],
        limit: currentLimit,
        offset: offset,
      });

      const stats = await this.getHarPaymentStats(guid);

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

      if (!updated) {
        return errorResponse(HttpStatuses.NOT_FOUND, 'Updated record not found');
      }

      const targetGuid = this.extractGuid(updated);
      if (!targetGuid) {
        return errorResponse(HttpStatuses.BAD_REQUEST, 'Target reference missing');
      }

      const stats = await this.getHarPaymentStats(targetGuid);
      return successResponse(HttpStatuses.OK, { ...updated.toJSON(), stats }, 'Payment updated successfully');
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Update error', error);
    }
  }

  async deleteHarPayment(guid: string) {
    try {
      const payment = await this.harPaymentRepo.findOne({ where: { guid } });
      if (!payment) return errorResponse(HttpStatuses.NOT_FOUND, 'Payment not found');

      const targetGuid = this.extractGuid(payment);
      await this.harPaymentRepo.destroy({ where: { guid } });

      if (!targetGuid) {
        return successResponse(HttpStatuses.OK, null, 'Payment deleted successfully');
      }

      const stats = await this.getHarPaymentStats(targetGuid);
      return successResponse(HttpStatuses.OK, stats, 'Payment deleted successfully');
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Delete error', error);
    }
  }


  private extractGuid(obj: { hotel_guid?: string; airway_guid?: string; railway_guid?: string }) {
    return obj.hotel_guid || obj.airway_guid || obj.railway_guid || null;
  }


  private async getHarPaymentStats(guid: string) {
    const stats = await this.sequelize.query(`
      SELECT 
        target.guid as "target_guid",
        target.price as "total_price",
        COALESCE(SUM(hp.amount), 0) as "paid_amount"
      FROM (
        SELECT guid, price FROM tbl_hotel WHERE guid = :guid
        UNION
        SELECT guid, price FROM tbl_airway WHERE guid = :guid
        UNION
        SELECT guid, price FROM tbl_railway WHERE guid = :guid
      ) target
      LEFT JOIN "tbl_HAR_payments" hp ON (
        hp.hotel_guid = target.guid OR 
        hp.airway_guid = target.guid OR 
        hp.railway_guid = target.guid
      )
      GROUP BY target.guid, target.price
    `, {
      replacements: { guid },
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