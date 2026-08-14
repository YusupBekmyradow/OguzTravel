import { Injectable } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { CreateTtpPaymentDto } from './dto/create-ttp_payment.dto';
import { UpdateTtpPaymentDto } from './dto/update-ttp_payment.dto';
import { InjectModel } from '@nestjs/sequelize';
import { TtpPayment } from './entities/ttp_payment.entity';
import { Sequelize } from 'sequelize-typescript';
import { Employee } from '../employee/entities/employee.entity';
import { errorResponse, successResponse } from '../../helpers/responseFunctions';
import { HttpStatuses } from '../../helpers/httpStatuses.enum';
import { QueryTypes } from 'sequelize';

@Injectable()
export class TtpPaymentService {
  constructor(
    @InjectModel(TtpPayment) private ttpPaymentRepo: typeof TtpPayment,
    private sequelize: Sequelize,
    private readonly i18n: I18nService,
  ) { }

  private getTargetInfo(data: any) {
    if (data.tour_guid) return { guid: data.tour_guid, table: 'tbl_tour', col: 'tour_guid' };
    if (data.transfer_guid) return { guid: data.transfer_guid, table: 'tbl_transfer', col: 'transfer_guid' };
    if (data.package_guid) return { guid: data.package_guid, table: 'tbl_package', col: 'package_guid' };
    return null;
  }

  private async getTtpPaymentStats(target: { guid: string, table: string, col: string }) {
    const stats = await this.sequelize.query(`
      SELECT 
        target.guid as "target_guid",
        target.price as "total_price",
        COALESCE(SUM(tp.amount), 0) as "paid_amount"
      FROM ${target.table} target
      LEFT JOIN "tbl_TTP_payments" tp ON tp.${target.col} = target.guid
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

  async addTtpPayment(createDto: CreateTtpPaymentDto, lang: string = 'tk') {
    try {
      const payment = await this.ttpPaymentRepo.create({ ...createDto } as any);
      const createdPayment = await this.ttpPaymentRepo.findByPk(payment.guid, {
        include: [{ model: Employee, as: 'operator', attributes: ['guid', 'fullName'] }]
      });

      if (!createdPayment) return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('ttp_payment.notFound', { lang }));

      const target = this.getTargetInfo(createDto);
      if (!target) return errorResponse(HttpStatuses.BAD_REQUEST, this.i18n.t('ttp_payment.notFound', { lang }));

      const stats = await this.getTtpPaymentStats(target);
      return successResponse(HttpStatuses.CREATED, { ...createdPayment.toJSON(), stats }, this.i18n.t('ttp_payment.created', { lang }));
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('ttp_payment.createFailed', { lang }), error);
    }
  }

  async getAllTtpPayments(page: number, limit: number, filters: { tour_guid?: string, transfer_guid?: string, package_guid?: string }, lang: string = 'tk') {
    try {
      const currentPage = Math.max(1, Number(page));
      const currentLimit = Math.max(1, Number(limit));
      const offset = (currentPage - 1) * currentLimit;

      const where: any = {};
      let target: any = null;

      if (filters.tour_guid) {
        where.tour_guid = filters.tour_guid;
        target = { guid: filters.tour_guid, table: 'tbl_tour', col: 'tour_guid' };
      } else if (filters.transfer_guid) {
        where.transfer_guid = filters.transfer_guid;
        target = { guid: filters.transfer_guid, table: 'tbl_transfer', col: 'transfer_guid' };
      } else if (filters.package_guid) {
        where.package_guid = filters.package_guid;
        target = { guid: filters.package_guid, table: 'tbl_package', col: 'package_guid' };
      } else {
        return errorResponse(HttpStatuses.BAD_REQUEST, this.i18n.t('ttp_payment.notFound', { lang }));
      }

      const { rows, count } = await this.ttpPaymentRepo.findAndCountAll({
        where,
        include: [{ model: Employee, as: 'operator', attributes: ['guid', 'fullName'] }],
        order: [['index_number', 'DESC']],
        limit: currentLimit,
        offset: offset,
      });

      const stats = await this.getTtpPaymentStats(target);

      return successResponse(HttpStatuses.OK, {
        data: rows,
        stats,
        meta: { totalItems: count, totalPages: Math.ceil(count / currentLimit), currentPage }
      }, this.i18n.t('ttp_payment.listFetched', { lang }));
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('ttp_payment.fetchFailed', { lang }), error);
    }
  }

  async updateTtpPayment(updateDto: UpdateTtpPaymentDto, lang: string = 'tk') {
    try {
      const payment = await this.ttpPaymentRepo.findOne({ where: { guid: updateDto.guid } });
      if (!payment) return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('ttp_payment.notFound', { lang }));

      await this.ttpPaymentRepo.update(updateDto as any, { where: { guid: updateDto.guid } });
      const updated = await this.ttpPaymentRepo.findOne({
        where: { guid: updateDto.guid },
        include: [{ model: Employee, as: 'operator', attributes: ['guid', 'fullName'] }]
      });

      if (!updated) return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('ttp_payment.notFound', { lang }));

      const target = this.getTargetInfo(updated);
      if (!target) return errorResponse(HttpStatuses.BAD_REQUEST, this.i18n.t('ttp_payment.notFound', { lang }));

      const stats = await this.getTtpPaymentStats(target);
      return successResponse(HttpStatuses.OK, { ...updated.toJSON(), stats }, this.i18n.t('ttp_payment.updated', { lang }));
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('ttp_payment.updateFailed', { lang }), error);
    }
  }

  async deleteTtpPayment(guid: string, lang: string = 'tk') {
    try {
      const payment = await this.ttpPaymentRepo.findOne({ where: { guid } });
      if (!payment) return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('ttp_payment.notFound', { lang }));

      const target = this.getTargetInfo(payment);
      await this.ttpPaymentRepo.destroy({ where: { guid } });

      if (!target) return successResponse(HttpStatuses.OK, null, this.i18n.t('ttp_payment.deleted', { lang }));

      const stats = await this.getTtpPaymentStats(target);
      return successResponse(HttpStatuses.OK, stats, this.i18n.t('ttp_payment.deleted', { lang }));
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('ttp_payment.deleteFailed', { lang }), error);
    }
  }
}
