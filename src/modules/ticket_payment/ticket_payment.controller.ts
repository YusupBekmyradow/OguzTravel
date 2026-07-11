import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { TicketPaymentService } from './ticket_payment.service';
import { CreateTicketPaymentDto } from './dto/create-ticket_payment.dto';
import { UpdateTicketPaymentDto } from './dto/update-ticket_payment.dto';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Ticket_Payment')
@Controller('ticket-payment')
export class TicketPaymentController {
  constructor(private readonly ticketPaymentService: TicketPaymentService) { }

  @Post('/add-ticket-payment')
  create(@Body() createTicketPaymentDto: CreateTicketPaymentDto) {
    return this.ticketPaymentService.addTicketPayment(createTicketPaymentDto);
  }

}
