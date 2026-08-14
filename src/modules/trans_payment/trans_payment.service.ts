import { Injectable } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { CreateTransPaymentDto } from './dto/create-trans_payment.dto';
import { UpdateTransPaymentDto } from './dto/update-trans_payment.dto';
import { InjectModel } from '@nestjs/sequelize';
import { TransPayment } from './entities/trans_payment.entity';
import { Sequelize } from 'sequelize-typescript';
import { Employee } from '../employee/entities/employee.entity';
import { errorResponse, successResponse } from '../../helpers/responseFunctions';
import { HttpStatuses } from '../../helpers/httpStatuses.enum';
import { QueryTypes } from 'sequelize';

@Injectable()
export class TransPaymentService {
  constructor(
    @InjectModel(TransPayment) private transPaymentRepo: typeof TransPayment,
    private sequelize: Sequelize,
    private readonly i18n: I18nService,
  ) { }

  async addTransPayment(createDto: CreateTransPaymentDto, lang: string = 'tk') {
    try {
      const payment = await this.transPaymentRepo.create({ ...createDto } as any);

      const createdPayment = await this.transPaymentRepo.findByPk(payment.guid, {
        include: [{ model: Employee, as: 'transoperator', attributes: ['guid', 'fullName'] }]
      });
      if (!createdPayment) {
        return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('trans_payment.notFound', { lang }));
      }
      const stats = await this.getTransPaymentStats(createDto.translation_guid);
      return successResponse(HttpStatuses.CREATED, { ...createdPayment.toJSON(), stats }, this.i18n.t('trans_payment.created', { lang }));
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('trans_payment.createFailed', { lang }), error);
    }
  }

  async getAllTransPayments(page: number = 1, limit: number = 10, translation_guid: string, lang: string = 'tk') {
    try {
      const currentPage = Math.max(1, Number(page));
      const currentLimit = Math.max(1, Number(limit));
      const offset = (currentPage - 1) * currentLimit;
      if (!translation_guid) {
        return errorResponse(HttpStatuses.BAD_REQUEST, this.i18n.t('trans_payment.notFound', { lang }));
      }
      const { rows, count } = await this.transPaymentRepo.findAndCountAll({
        where: { translation_guid },
        include: [{ model: Employee, as: 'transoperator', attributes: ['guid', 'fullName'] }],
        order: [['index_number', 'DESC']],
        limit: currentLimit,
        offset: offset,
      });

      const stats = await this.getTransPaymentStats(translation_guid);

      return successResponse(HttpStatuses.OK, {
        data: rows,
        stats,
        meta: { totalItems: count, totalPages: Math.ceil(count / currentLimit), currentPage }
      }, this.i18n.t('trans_payment.listFetched', { lang }));
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('trans_payment.fetchFailed', { lang }), error);
    }
  }

  async updateTransPayment(updateDto: UpdateTransPaymentDto, lang: string = 'tk') {
    try {
      const payment = await this.transPaymentRepo.findOne({ where: { guid: updateDto.guid } });
      if (!payment) return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('trans_payment.notFound', { lang }));

      await this.transPaymentRepo.update(updateDto as any, { where: { guid: updateDto.guid } });

      const updated = await this.transPaymentRepo.findOne({
        where: { guid: updateDto.guid },
        include: [{ model: Employee, as: 'transoperator', attributes: ['guid', 'fullName'] }]
      });

      if (!updated) {
        return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('trans_payment.notFound', { lang }));
      }
      const stats = await this.getTransPaymentStats(updated.translation_guid);
      return successResponse(HttpStatuses.OK, { ...updated.toJSON(), stats }, this.i18n.t('trans_payment.updated', { lang }));
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('trans_payment.updateFailed', { lang }), error);
    }
  }

  async deleteTransPayment(guid: string, lang: string = 'tk') {
    try {
      const payment = await this.transPaymentRepo.findOne({ where: { guid } });
      if (!payment) return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('trans_payment.notFound', { lang }));

      const translation_guid = payment.translation_guid;
      await this.transPaymentRepo.destroy({ where: { guid } });

      const stats = await this.getTransPaymentStats(translation_guid);
      return successResponse(HttpStatuses.OK, stats, this.i18n.t('trans_payment.deleted', { lang }));
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('trans_payment.deleteFailed', { lang }), error);
    }
  }

  private async getTransPaymentStats(translation_guid: string) {
    const stats = await this.sequelize.query(`
      SELECT 
        gt.guid as "translation_guid",
        gt.price as "total_price",
        COALESCE(SUM(tp.amount), 0) as "paid_amount"
      FROM tbl_general_translations gt
      LEFT JOIN tbl_trans_payments tp ON gt.guid = tp.translation_guid
      WHERE gt.guid = :translation_guid
      GROUP BY gt.guid, gt.price
    `, {
      replacements: { translation_guid },
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
