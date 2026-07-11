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

}
