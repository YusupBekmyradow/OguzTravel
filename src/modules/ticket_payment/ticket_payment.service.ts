import { Injectable } from '@nestjs/common';
import { CreateTicketPaymentDto } from './dto/create-ticket_payment.dto';
import { UpdateTicketPaymentDto } from './dto/update-ticket_payment.dto';
import { InjectModel } from '@nestjs/sequelize';
import { TicketPayment } from './entities/ticket_payment.entity';
import { errorResponse, successResponse } from '../../helpers/responseFunctions';
import { HttpStatuses } from '../../helpers/httpStatuses.enum';
import { Sequelize } from 'sequelize-typescript';
import { QueryTypes } from 'sequelize';

@Injectable()
export class TicketPaymentService {
  constructor(
    @InjectModel(TicketPayment) private ticketPaymentRepo: typeof TicketPayment,
    private sequelize: Sequelize,
  ) { }


  async addTicketPayment(createTicketPaymentDto: CreateTicketPaymentDto) {
    try {
      const ticketPayment = await this.ticketPaymentRepo.create({
        ...createTicketPaymentDto,
      } as any)
      const statsResult = await this.getPaymentStats(createTicketPaymentDto.b2b_guid);

      const combinedData = {
        ...ticketPayment.toJSON(),
        ...statsResult
      };
      return successResponse(HttpStatuses.CREATED, combinedData, 'TicketPayment created successfully')
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'TicketPayment creation failed', error)
    }
  }


  async getAllTicketPayment(page: number = 1, limit: number = 10, b2b_guid: string) {
    try {
      const currentPage = Math.max(1, Number(page));
      const currentLimit = Math.max(1, Number(limit));
      const offset = (currentPage - 1) * currentLimit;

      const { rows, count } = await this.ticketPaymentRepo.findAndCountAll({
        where: { b2b_guid },
        order: [['createdAt', 'DESC']],
        limit: Number(limit),
        offset: Number(offset),
      });

      const stats = await this.getPaymentStats(b2b_guid);
      const dataWithStats = rows.map(row => ({
        ...row.toJSON(),
        ...stats
      }));
      return {
        status: 200,
        data: dataWithStats,
        meta: {
          totalItems: count,
          totalPages: Math.ceil(count / limit),
          currentPage: currentPage
        },
        message: 'TicketPayment fetched successfully'
      };
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'TicketPayment fetching error', error);
    }
  }


  async updateTicketPayment(updateTicketPaymentDto: UpdateTicketPaymentDto) {
    try {
      const ticketPayment = await this.ticketPaymentRepo.findOne({ where: { guid: updateTicketPaymentDto.guid } });
      if (!ticketPayment) return errorResponse(HttpStatuses.NOT_FOUND, 'TicketPayment not found');

      await this.ticketPaymentRepo.update(updateTicketPaymentDto as any, { where: { guid: updateTicketPaymentDto.guid } });

      const updatedTicketPayment = await this.ticketPaymentRepo.findOne({ where: { guid: updateTicketPaymentDto.guid } });

      if (updatedTicketPayment) {
        const stats = await this.getPaymentStats(updatedTicketPayment.b2b_guid);
        const combinedData = {
          ...updatedTicketPayment.toJSON(),
          ...stats
        };
        return successResponse(HttpStatuses.OK, combinedData, 'TicketPayment updated successfully');
      }
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Update error', error);
    }
  }


  async deleteTicketPayment(guid: string) {
    try {
      const deletedCount = await this.ticketPaymentRepo.destroy({
        where: { guid }
      });

      if (deletedCount === 0) {
        return errorResponse(HttpStatuses.NOT_FOUND, 'TicketPayment not found');
      }
      return successResponse(HttpStatuses.OK, null, 'TicketPayment deleted successfully');
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Delete error', error);
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
