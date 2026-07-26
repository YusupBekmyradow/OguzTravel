import { Controller, Get, Post, Body, Patch, Delete, Query } from '@nestjs/common';
import { TtpPaymentService } from './ttp_payment.service';
import { CreateTtpPaymentDto } from './dto/create-ttp_payment.dto';
import { UpdateTtpPaymentDto } from './dto/update-ttp_payment.dto';
import { ApiBody, ApiTags } from '@nestjs/swagger';

@ApiTags('TTP_Payment')
@Controller('ttp-payment')
export class TtpPaymentController {
  constructor(private readonly ttpPaymentService: TtpPaymentService) { }

  @Post('/add-ttp-payment')
  create(@Body() createTtpPaymentDto: CreateTtpPaymentDto) {
    return this.ttpPaymentService.addTtpPayment(createTtpPaymentDto);
  }

  @Get('/get-all-ttp-payment')
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('tour_guid') tour_guid?: string,
    @Query('transfer_guid') transfer_guid?: string,
    @Query('package_guid') package_guid?: string,
  ) {
    return this.ttpPaymentService.getAllTtpPayments(Number(page), Number(limit), {
      tour_guid,
      transfer_guid,
      package_guid
    });
  }

  @Patch('/update-ttp-payment')
  async update(@Body() updateTtpPaymentDto: UpdateTtpPaymentDto) {
    return this.ttpPaymentService.updateTtpPayment(updateTtpPaymentDto);
  }

  @Delete('/delete-ttp-payment')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        guid: { type: 'string' }
      }
    }
  })
  async remove(@Body('guid') guid: string) {
    return this.ttpPaymentService.deleteTtpPayment(guid);
  }
}