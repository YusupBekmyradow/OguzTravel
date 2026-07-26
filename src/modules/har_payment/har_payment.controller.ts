import { Controller, Get, Post, Body, Patch, Delete, Query } from '@nestjs/common';
import { HarPaymentService } from './har_payment.service';
import { CreateHarPaymentDto } from './dto/create-har_payment.dto';
import { UpdateHarPaymentDto } from './dto/update-har_payment.dto';
import { ApiBody, ApiTags } from '@nestjs/swagger';

@ApiTags('Har_Payment')
@Controller('har-payment')
export class HarPaymentController {
  constructor(private readonly harPaymentService: HarPaymentService) { }

  @Post('/add-har-payment')
  create(@Body() createHarPaymentDto: CreateHarPaymentDto) {
    return this.harPaymentService.addHarPayment(createHarPaymentDto);
  }

  @Get('/get-all-har-payment')
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('hotel_guid') hotel_guid?: string,
    @Query('airway_guid') airway_guid?: string,
    @Query('railway_guid') railway_guid?: string,
  ) {
    return this.harPaymentService.getAllHarPayments(Number(page), Number(limit), {
      hotel_guid,
      airway_guid,
      railway_guid
    });
  }

  @Patch('/update-har-payment')
  async update(@Body() updateHarPaymentDto: UpdateHarPaymentDto) {
    return this.harPaymentService.updateHarPayment(updateHarPaymentDto);
  }

  @Delete('/delete-har-payment')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        guid: { type: 'string' }
      }
    }
  })
  async remove(@Body('guid') guid: string) {
    return this.harPaymentService.deleteHarPayment(guid);
  }
}