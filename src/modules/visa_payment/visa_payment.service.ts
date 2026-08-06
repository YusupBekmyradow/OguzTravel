import { Injectable } from '@nestjs/common';
import { CreateVisaPaymentDto } from './dto/create-visa_payment.dto';
import { UpdateVisaPaymentDto } from './dto/update-visa_payment.dto';
import { Sequelize } from 'sequelize-typescript';
import { InjectModel } from '@nestjs/sequelize';
import { VisaPayment } from './entities/visa_payment.entity';
import { Employee } from '../employee/entities/employee.entity';
import { errorResponse, successResponse } from '../../helpers/responseFunctions';
import { HttpStatuses } from '../../helpers/httpStatuses.enum';
import { QueryTypes } from 'sequelize';
import { I18nService } from 'nestjs-i18n';

@Injectable()
export class VisaPaymentService {
  constructor(
    @InjectModel(VisaPayment) private visaPaymentRepo: typeof VisaPayment,
    private sequelize: Sequelize,
    private readonly i18n: I18nService,
  ) { }


  async addVisaPayment(createDto: CreateVisaPaymentDto, lang: string) {
    try {
      const payment = await this.visaPaymentRepo.create({
        ...createDto,
      } as any);
      const createdPayment = await this.visaPaymentRepo.findByPk(payment.guid, {
        include: [{ model: Employee, as: 'visaoperator', attributes: ['guid', 'fullName'] }]
      });
      if (!createdPayment) {
        return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('payment.notFoundAfterCreate', { lang }));
      }

      let statsResult = {};
      if (createDto.visa_guid) {
        statsResult = await this.getVisaPaymentStats(createDto.visa_guid);
      } else if (createDto.inbound_guid) {
        statsResult = await this.getInboundPaymentStats(createDto.inbound_guid);
      }

      const combinedData = {
        ...createdPayment.toJSON(),
        ...statsResult
      };
      return successResponse(HttpStatuses.CREATED, combinedData, this.i18n.t('payment.created', { lang }));
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('payment.createFailed', { lang }), error);
    }
  }



  async getAllVisaPayment(page: number = 1, limit: number = 10, visa_guid?: string, inbound_guid?: string, lang: string = 'tk') {
    try {
      const currentPage = Math.max(1, Number(page));
      const currentLimit = Math.max(1, Number(limit));
      const offset = (currentPage - 1) * currentLimit;
      const whereCondition: any = {};
      if (visa_guid) whereCondition.visa_guid = visa_guid;
      if (inbound_guid) whereCondition.inbound_guid = inbound_guid;

      const { rows, count } = await this.visaPaymentRepo.findAndCountAll({
        where: whereCondition,
        include: [
          {
            model: Employee,
            as: 'visaoperator',
            attributes: ['guid', 'fullName']
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: Number(limit),
        offset: Number(offset),
      });

      let stats = {};
      if (visa_guid) {
        stats = await this.getVisaPaymentStats(visa_guid);
      } else if (inbound_guid) {
        stats = await this.getInboundPaymentStats(inbound_guid);
      }
      return {
        status: 200,
        data: rows,
        stats: stats,
        meta: {
          totalItems: count,
          totalPages: Math.ceil(count / currentLimit),
          currentPage: currentPage
        },
        message: this.i18n.t('payment.listFetched', { lang }),
      };
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('payment.fetchFailed', { lang }), error);
    }
  }



  async updateVisaPayment(updateDto: UpdateVisaPaymentDto, lang: string) {
    try {
      const payment = await this.visaPaymentRepo.findOne({ where: { guid: updateDto.guid } });
      if (!payment) return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('payment.notFound', { lang }));
      await this.visaPaymentRepo.update(updateDto as any, { where: { guid: updateDto.guid } });
      const updatedPayment = await this.visaPaymentRepo.findOne({
        where: { guid: updateDto.guid },
        include: [{ model: Employee, as: 'visaoperator', attributes: ['guid', 'fullName'] }]
      });
      if (!updatedPayment) {
        return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('payment.updatedNotFound', { lang }));
      }
      let stats = {};
      if (updatedPayment.visa_guid) {
        stats = await this.getVisaPaymentStats(updatedPayment.visa_guid);
      } else if (updatedPayment.inbound_guid) {
        stats = await this.getInboundPaymentStats(updatedPayment.inbound_guid);
      } const combinedData = {
        ...updatedPayment.toJSON(),
        ...stats
      };
      return successResponse(HttpStatuses.OK, combinedData, this.i18n.t('payment.updated', { lang }));
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('payment.updateFailed', { lang }), error);
    }
  }


  async deleteVisaPayment(guid: string, lang: string) {
    try {
      const payment = await this.visaPaymentRepo.findOne({ where: { guid } });
      if (!payment) return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('payment.notFound', { lang }));
      const visa_guid = payment.visa_guid;
      const inbound_guid = payment.inbound_guid;
      await this.visaPaymentRepo.destroy({ where: { guid } });
      let stats = {};
      if (visa_guid) {
        stats = await this.getVisaPaymentStats(visa_guid);
      } else if (inbound_guid) {
        stats = await this.getInboundPaymentStats(inbound_guid);
      } return successResponse(HttpStatuses.OK, stats, this.i18n.t('payment.deleted', { lang }));
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('payment.deleteFailed', { lang }), error);
    }
  }


  private async getVisaPaymentStats(visa_guid: string) {
    const stats = await this.sequelize.query(`
      SELECT 
        v.guid as "visa_guid",
        v.price_tmt as "total_sales_tmt",
        v.price_usd as "total_sales_usd",
        COALESCE(SUM(CASE WHEN vp.currency = 'TMT' THEN vp.amount ELSE 0 END), 0) as "paid_tmt",
        COALESCE(SUM(CASE WHEN vp.currency = 'USD' THEN vp.amount ELSE 0 END), 0) as "paid_usd"
      FROM tbl_visa v
      LEFT JOIN tbl_visa_payments vp ON v.guid = vp.visa_guid
      WHERE v.guid = :visa_guid
      GROUP BY v.guid, v.price_tmt, v.price_usd
    `, {
      replacements: { visa_guid },
      type: QueryTypes.SELECT
    });

    const row = (stats[0] as any) || { total_sales_tmt: 0, total_sales_usd: 0, paid_tmt: 0, paid_usd: 0 };

    const tmtTotal = Number(row.total_sales_tmt);
    const usdTotal = Number(row.total_sales_usd);
    const tmtPaid = Number(row.paid_tmt);
    const usdPaid = Number(row.paid_usd);

    return {
      TMT: {
        total_sales: tmtTotal,
        total_paid: tmtPaid,
        remaining: tmtTotal - tmtPaid
      },
      USD: {
        total_sales: usdTotal,
        total_paid: usdPaid,
        remaining: usdTotal - usdPaid
      }
    };
  }


  private async getInboundPaymentStats(inbound_guid: string) {
    const stats = await this.sequelize.query(`
      SELECT 
        COALESCE(SUM(CASE WHEN currency = 'TMT' THEN amount ELSE 0 END), 0) as "paid_tmt",
        COALESCE(SUM(CASE WHEN currency = 'USD' THEN amount ELSE 0 END), 0) as "paid_usd"
      FROM tbl_visa_payments
      WHERE inbound_guid = :inbound_guid
    `, {
      replacements: { inbound_guid },
      type: QueryTypes.SELECT
    });

    const row = (stats[0] as any) || { paid_tmt: 0, paid_usd: 0 };

    return {
      TMT: {
        total_paid: Number(row.paid_tmt)
      },
      USD: {
        total_paid: Number(row.paid_usd)
      }
    };
  }
}
