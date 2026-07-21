import { Injectable } from '@nestjs/common';
import { CreateTtpPaymentDto } from './dto/create-ttp_payment.dto';
import { UpdateTtpPaymentDto } from './dto/update-ttp_payment.dto';
import { InjectModel } from '@nestjs/sequelize';
import { TtpPayment } from './entities/ttp_payment.entity';
import { Sequelize } from 'sequelize-typescript';
import { Employee } from '../employee/entities/employee.entity';
import { errorResponse, successResponse } from '../../helpers/responseFunctions';
import { HttpStatuses } from '../../helpers/httpStatuses.enum';
import { QueryTypes, Op } from 'sequelize';

@Injectable()
export class TtpPaymentService {
  constructor(
    @InjectModel(TtpPayment) private ttpPaymentRepo: typeof TtpPayment,
    private sequelize: Sequelize,
  ) { }

  async addTtpPayment(createDto: CreateTtpPaymentDto) {
    try {
      const payment = await this.ttpPaymentRepo.create({ ...createDto } as any);

      const createdPayment = await this.ttpPaymentRepo.findByPk(payment.guid, {
        include: [{ model: Employee, as: 'operator', attributes: ['guid', 'fullName'] }]
      });
      if (!createdPayment) {
        return errorResponse(HttpStatuses.NOT_FOUND, 'Payment not found');
      }

      const targetGuid = this.extractGuid(createDto);
      if (!targetGuid) {
        return errorResponse(HttpStatuses.BAD_REQUEST, 'A valid reference guid (tour, transfer or package) must be provided');
      }

      const stats = await this.getTtpPaymentStats(targetGuid);
      return successResponse(HttpStatuses.CREATED, { ...createdPayment.toJSON(), stats }, 'Payment created successfully');
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Payment creation failed', error);
    }
  }

  async getAllTtpPayments(page: number = 1, limit: number = 10, guid: string) {
    try {
      const currentPage = Math.max(1, Number(page));
      const currentLimit = Math.max(1, Number(limit));
      const offset = (currentPage - 1) * currentLimit;

      if (!guid) {
        return errorResponse(HttpStatuses.BAD_REQUEST, 'guid is required');
      }

      const { rows, count } = await this.ttpPaymentRepo.findAndCountAll({
        where: {
          [Op.or]: [
            { tour_guid: guid },
            { transfer_guid: guid },
            { package_guid: guid }
          ]
        },
        include: [{ model: Employee, as: 'operator', attributes: ['guid', 'fullName'] }],
        order: [['index_number', 'DESC']],
        limit: currentLimit,
        offset: offset,
      });

      const stats = await this.getTtpPaymentStats(guid);

      return successResponse(HttpStatuses.OK, {
        data: rows,
        stats,
        meta: { totalItems: count, totalPages: Math.ceil(count / currentLimit), currentPage }
      }, 'Payments fetched successfully');
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Fetching error', error);
    }
  }

  async updateTtpPayment(updateDto: UpdateTtpPaymentDto) {
    try {
      const payment = await this.ttpPaymentRepo.findOne({ where: { guid: updateDto.guid } });
      if (!payment) return errorResponse(HttpStatuses.NOT_FOUND, 'Payment not found');

      await this.ttpPaymentRepo.update(updateDto as any, { where: { guid: updateDto.guid } });

      const updated = await this.ttpPaymentRepo.findOne({
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

      const stats = await this.getTtpPaymentStats(targetGuid);
      return successResponse(HttpStatuses.OK, { ...updated.toJSON(), stats }, 'Payment updated successfully');
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Update error', error);
    }
  }

  async deleteTtpPayment(guid: string) {
    try {
      const payment = await this.ttpPaymentRepo.findOne({ where: { guid } });
      if (!payment) return errorResponse(HttpStatuses.NOT_FOUND, 'Payment not found');

      const targetGuid = this.extractGuid(payment);
      await this.ttpPaymentRepo.destroy({ where: { guid } });

      if (!targetGuid) {
        return successResponse(HttpStatuses.OK, null, 'Payment deleted successfully');
      }

      const stats = await this.getTtpPaymentStats(targetGuid);
      return successResponse(HttpStatuses.OK, stats, 'Payment deleted successfully');
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Delete error', error);
    }
  }

  private extractGuid(obj: { tour_guid?: string; transfer_guid?: string; package_guid?: string }) {
    return obj.tour_guid || obj.transfer_guid || obj.package_guid || null;
  }

  private async getTtpPaymentStats(guid: string) {
    const stats = await this.sequelize.query(`
      SELECT 
        target.guid as "target_guid",
        target.price as "total_price",
        COALESCE(SUM(tp.amount), 0) as "paid_amount"
      FROM (
        SELECT guid, price FROM tbl_tour WHERE guid = :guid
        UNION
        SELECT guid, price FROM tbl_transfer WHERE guid = :guid
        UNION
        SELECT guid, price FROM tbl_package WHERE guid = :guid
      ) target
      LEFT JOIN "tbl_TTP_payments" tp ON (
        tp.tour_guid = target.guid OR 
        tp.transfer_guid = target.guid OR 
        tp.package_guid = target.guid
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