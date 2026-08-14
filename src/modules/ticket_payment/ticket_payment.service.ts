import { Injectable } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { CreateTicketPaymentDto } from './dto/create-ticket_payment.dto';
import { UpdateTicketPaymentDto } from './dto/update-ticket_payment.dto';
import { InjectModel } from '@nestjs/sequelize';
import { TicketPayment } from './entities/ticket_payment.entity';
import { errorResponse, successResponse } from '../../helpers/responseFunctions';
import { HttpStatuses } from '../../helpers/httpStatuses.enum';
import { Sequelize } from 'sequelize-typescript';
import { QueryTypes } from 'sequelize';
import { Employee } from '../employee/entities/employee.entity';
import { B2b } from '../b2b/entities/b2b.entity';

@Injectable()
export class TicketPaymentService {
  constructor(
    @InjectModel(TicketPayment) private ticketPaymentRepo: typeof TicketPayment,
    @InjectModel(B2b) private b2bRepository: typeof B2b,
    private sequelize: Sequelize,
    private readonly i18n: I18nService,
  ) { }

  async addTicketPayment(createTicketPaymentDto: CreateTicketPaymentDto, lang: string = 'tk') {
    try {
      const ticketPayment = await this.ticketPaymentRepo.create({
        ...createTicketPaymentDto,
      } as any);
      const createdPayment = await this.ticketPaymentRepo.findByPk(ticketPayment.guid, {
        include: [{ model: Employee, as: 'operator', attributes: ['guid', 'fullName'] }]
      });
      if (!createdPayment) {
        return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('ticket_payment.notFound', { lang }));
      }
      const statsResult = await this.getPaymentStats(createTicketPaymentDto.b2b_guid);
      const stats = statsResult as any;
      if (stats.remaining <= 0) {
        await this.b2bRepository.update(
          { is_paid: true },
          { where: { guid: createTicketPaymentDto.b2b_guid } }
        );
      }
      const combinedData = {
        ...createdPayment.toJSON(),
        ...statsResult
      };
      return successResponse(HttpStatuses.CREATED, combinedData, this.i18n.t('ticket_payment.created', { lang }));
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('ticket_payment.createFailed', { lang }), error);
    }
  }

  async getAllTicketPayment(page: number = 1, limit: number = 10, b2b_guid: string, lang: string = 'tk') {
    try {
      const currentPage = Math.max(1, Number(page));
      const currentLimit = Math.max(1, Number(limit));
      const offset = (currentPage - 1) * currentLimit;

      const { rows, count } = await this.ticketPaymentRepo.findAndCountAll({
        where: { b2b_guid },
        include: [{ model: Employee, as: 'operator', attributes: ['guid', 'fullName'] }],
        order: [['createdAt', 'DESC']],
        limit: Number(limit),
        offset: Number(offset),
      });

      const stats = await this.getPaymentStats(b2b_guid);

      return {
        status: 200,
        data: rows,
        stats: stats,
        meta: {
          totalItems: count,
          totalPages: Math.ceil(count / currentLimit),
          currentPage: currentPage
        },
        message: this.i18n.t('ticket_payment.listFetched', { lang })
      };
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('ticket_payment.fetchFailed', { lang }), error);
    }
  }

  async updateTicketPayment(updateTicketPaymentDto: UpdateTicketPaymentDto, lang: string = 'tk') {
    try {
      const ticketPayment = await this.ticketPaymentRepo.findOne({ where: { guid: updateTicketPaymentDto.guid } });
      if (!ticketPayment) return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('ticket_payment.notFound', { lang }));

      await this.ticketPaymentRepo.update(updateTicketPaymentDto as any, { where: { guid: updateTicketPaymentDto.guid } });

      const updatedTicketPayment = await this.ticketPaymentRepo.findOne({
        where: { guid: updateTicketPaymentDto.guid },
        include: [{ model: Employee, as: 'operator', attributes: ['guid', 'fullName'] }]
      });
      if (updatedTicketPayment) {
        const stats = await this.getPaymentStats(updatedTicketPayment.b2b_guid);
        const statsResult = stats as any;
        await this.b2bRepository.update(
          { is_paid: statsResult.remaining <= 0 },
          { where: { guid: updatedTicketPayment.b2b_guid } }
        );
        const combinedData = {
          ...updatedTicketPayment.toJSON(),
          ...stats
        };
        return successResponse(HttpStatuses.OK, combinedData, this.i18n.t('ticket_payment.updated', { lang }));
      }
      return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('ticket_payment.notFound', { lang }));
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('ticket_payment.updateFailed', { lang }), error);
    }
  }

  async deleteTicketPayment(guid: string, lang: string = 'tk') {
    try {
      const payment = await this.ticketPaymentRepo.findOne({
        where: { guid }
      });
      if (!payment) {
        return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('ticket_payment.notFound', { lang }));
      }
      const b2b_guid = payment.b2b_guid;
      await this.ticketPaymentRepo.destroy({
        where: { guid }
      });

      const stats = await this.getPaymentStats(b2b_guid);
      const statsResult = stats as any;

      await this.b2bRepository.update(
        { is_paid: statsResult.remaining <= 0 },
        { where: { guid: b2b_guid } }
      );
      return successResponse(HttpStatuses.OK, stats, this.i18n.t('ticket_payment.deleted', { lang }));
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('ticket_payment.deleteFailed', { lang }), error);
    }
  }

  private async getPaymentStats(b2b_guid: string) {
    const stats = await this.sequelize.query(`
      SELECT 
        b.guid as "b2b_guid",
        b.sale_price as "total_sales",
        COALESCE(SUM(tp.amount), 0) as "total_paid",
        (b.sale_price - COALESCE(SUM(tp.amount), 0)) as "remaining"
      FROM tbl_b2b b
      LEFT JOIN tbl_ticket_payments tp ON b.guid = tp.b2b_guid
      WHERE b.guid = :b2b_guid
      GROUP BY b.guid, b.sale_price
    `, {
      replacements: { b2b_guid },
      type: QueryTypes.SELECT
    });

    return stats[0] || {
      b2b_guid,
      total_sales: 0,
      total_paid: 0,
      remaining: 0,
    };
  }
}
