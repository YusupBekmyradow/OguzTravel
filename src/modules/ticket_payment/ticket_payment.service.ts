import { Injectable } from '@nestjs/common';
import { CreateTicketPaymentDto } from './dto/create-ticket_payment.dto';
import { UpdateTicketPaymentDto } from './dto/update-ticket_payment.dto';
import { InjectModel } from '@nestjs/sequelize';
import { TicketPayment } from './entities/ticket_payment.entity';
import { errorResponse, successResponse } from '../../helpers/responseFunctions';
import { HttpStatuses } from '../../helpers/httpStatuses.enum';

@Injectable()
export class TicketPaymentService {
  constructor(
    @InjectModel(TicketPayment) private ticketPaymentRepo: typeof TicketPayment,
  ) { }

  async addTicketPayment(createTicketPaymentDto: CreateTicketPaymentDto) {
    try {
      const ticketPayment = await this.ticketPaymentRepo.create({
        ...createTicketPaymentDto,
      } as any)
      return successResponse(HttpStatuses.CREATED, ticketPayment, 'TicketPayment created successfully')
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'TicketPayment creation failed', error)
    }
  }

  async getAllTicketPayment(page: number = 1, limit: number = 10) {
    try {
      const currentPage = Math.max(1, Number(page));
      const currentLimit = Math.max(1, Number(limit));
      const offset = (currentPage - 1) * currentLimit;

      const { rows, count } = await this.ticketPaymentRepo.findAndCountAll({
        order: [['createdAt', 'DESC']],
        limit: Number(limit),
        offset: Number(offset),
      });
      return {
        status: 200,
        data: rows,
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

      return successResponse(HttpStatuses.OK, updatedTicketPayment, 'TicketPayment updated successfully');
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
}
