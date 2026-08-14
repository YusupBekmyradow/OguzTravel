import { Injectable } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
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
    private readonly i18n: I18nService,
  ) { }

  async addturkishPayment(createDto: CreateTurkishPaymentDto, lang: string = 'tk') {
    try {
      const payment = await this.turkishPaymentRepo.create({
        ...createDto,
      } as any);

      const createdPayment = await this.turkishPaymentRepo.findByPk(payment.guid, {
        include: [{ model: Employee, as: 'operator', attributes: ['guid', 'fullName'] }]
      });

      if (!createdPayment) {
        return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('turkish_payment.notFound', { lang }));
      }
      const statsResult = await this.getPaymentStats(createDto.turkish_airline_guid);

      const combinedData = {
        ...createdPayment.toJSON(),
        ...statsResult
      };
      return successResponse(HttpStatuses.CREATED, combinedData, this.i18n.t('turkish_payment.created', { lang }));
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('turkish_payment.createFailed', { lang }), error);
    }
  }

  async getAllturkishPayment(page: number = 1, limit: number = 10, turkish_airline_guid: string, lang: string = 'tk') {
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
        message: this.i18n.t('turkish_payment.listFetched', { lang })
      };
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('turkish_payment.fetchFailed', { lang }), error);
    }
  }

  async updateturkishPayment(updateDto: UpdateTurkishPaymentDto, lang: string = 'tk') {
    try {
      const payment = await this.turkishPaymentRepo.findOne({ where: { guid: updateDto.guid } });
      if (!payment) return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('turkish_payment.notFound', { lang }));

      await this.turkishPaymentRepo.update(updateDto as any, { where: { guid: updateDto.guid } });

      const updatedPayment = await this.turkishPaymentRepo.findOne({
        where: { guid: updateDto.guid },
        include: [{ model: Employee, as: 'operator', attributes: ['guid', 'fullName'] }]
      });
      if (!updatedPayment) {
        return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('turkish_payment.notFound', { lang }));
      }
      const stats = await this.getPaymentStats(updatedPayment.turkish_airline_guid);
      const combinedData = {
        ...updatedPayment.toJSON(),
        ...stats
      };
      return successResponse(HttpStatuses.OK, combinedData, this.i18n.t('turkish_payment.updated', { lang }));
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('turkish_payment.updateFailed', { lang }), error);
    }
  }

  async deleteturkishPayment(guid: string, lang: string = 'tk') {
    try {
      const payment = await this.turkishPaymentRepo.findOne({ where: { guid } });
      if (!payment) return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('turkish_payment.notFound', { lang }));

      const turkish_airline_guid = payment.turkish_airline_guid;
      await this.turkishPaymentRepo.destroy({ where: { guid } });

      const stats = await this.getPaymentStats(turkish_airline_guid);
      return successResponse(HttpStatuses.OK, stats, this.i18n.t('turkish_payment.deleted', { lang }));
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('turkish_payment.deleteFailed', { lang }), error);
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
