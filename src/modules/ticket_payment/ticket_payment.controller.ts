import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { TicketPaymentService } from './ticket_payment.service';
import { CreateTicketPaymentDto } from './dto/create-ticket_payment.dto';
import { UpdateTicketPaymentDto } from './dto/update-ticket_payment.dto';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { I18nLang } from 'nestjs-i18n';

@ApiTags('Ticket_Payment')
@ApiBearerAuth('bearerAuth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('/ticket/b2b', '/ticket/turkish-airlines')
@Controller('ticket-payment')
export class TicketPaymentController {
  constructor(private readonly ticketPaymentService: TicketPaymentService) { }

  @Post('/add-ticket-payment')
  create(@Body() createTicketPaymentDto: CreateTicketPaymentDto) {
    return this.ticketPaymentService.addTicketPayment(createTicketPaymentDto);
  }

  @Get('/getAll-ticket-payment')
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('b2b_guid') b2b_guid: string
  ) {
    return this.ticketPaymentService.getAllTicketPayment(Number(page), Number(limit), b2b_guid);
  }

  @Patch('/update-ticket-payment')
  async update(
    @Body() updateTicketPaymentDto: UpdateTicketPaymentDto) {
    return this.ticketPaymentService.updateTicketPayment(updateTicketPaymentDto);
  }


  @Delete('/delete-ticket-payment')
  @ApiBody({
    schema: {
      type: 'object', properties: {
        guid: { type: 'string' }
      }
    }
  })
  async remove(@Body('guid') guid: string) {
    return this.ticketPaymentService.deleteTicketPayment(guid);
  }
}

