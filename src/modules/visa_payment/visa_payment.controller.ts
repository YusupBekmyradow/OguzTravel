import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { VisaPaymentService } from './visa_payment.service';
import { CreateVisaPaymentDto } from './dto/create-visa_payment.dto';
import { UpdateVisaPaymentDto } from './dto/update-visa_payment.dto';
import { ApiBody, ApiQuery, ApiTags } from '@nestjs/swagger';

@ApiTags('Visa_Payment')
@Controller('visa-payment')
export class VisaPaymentController {
  constructor(private readonly visaPaymentService: VisaPaymentService) { }

  @Post('/add-visa-payment')
  create(@Body() createVisaPaymentDto: CreateVisaPaymentDto) {
    return this.visaPaymentService.addVisaPayment(createVisaPaymentDto);
  }

  @Get('/getAll-visa-payment')
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('visa_guid') visa_guid: string
  ) {
    return this.visaPaymentService.getAllVisaPayment(Number(page), Number(limit), visa_guid);
  }

  @Patch('/update-visa-payment')
  async update(@Body() updateVisaPaymentDto: UpdateVisaPaymentDto) {
    return this.visaPaymentService.updateVisaPayment(updateVisaPaymentDto);
  }

  @Delete('/delete-visa-payment')
  @ApiBody({
    schema: {
      type: 'object', properties: {
        guid: { type: 'string' }
      }
    }
  })
  async remove(@Body('guid') guid: string) {
    return this.visaPaymentService.deleteVisaPayment(guid);
  }
}