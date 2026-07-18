import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { TransPaymentService } from './trans_payment.service';
import { CreateTransPaymentDto } from './dto/create-trans_payment.dto';
import { UpdateTransPaymentDto } from './dto/update-trans_payment.dto';
import { ApiBody, ApiTags } from '@nestjs/swagger';

@ApiTags('Trans_Payment')
@Controller('trans-payment')
export class TransPaymentController {
  constructor(private readonly transPaymentService: TransPaymentService) { }

  @Post('/add-trans-payment')
  create(@Body() createTransPaymentDto: CreateTransPaymentDto) {
    return this.transPaymentService.addTransPayment(createTransPaymentDto);
  }

  @Get('/get-all-trans-payment')
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('translation_guid') translation_guid: string
  ) {
    return this.transPaymentService.getAllTransPayments(Number(page), Number(limit), translation_guid);
  }

  @Patch('/update-trans-payment')
  async update(@Body() updateTransPaymentDto: UpdateTransPaymentDto) {
    return this.transPaymentService.updateTransPayment(updateTransPaymentDto);
  }

  @Delete('/delete-trans-payment')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        guid: { type: 'string' }
      }
    }
  })
  async remove(@Body('guid') guid: string) {
    return this.transPaymentService.deleteTransPayment(guid);
  }
}
