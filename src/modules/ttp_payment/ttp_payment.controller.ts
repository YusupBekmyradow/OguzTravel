import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { TtpPaymentService } from './ttp_payment.service';
import { CreateTtpPaymentDto } from './dto/create-ttp_payment.dto';
import { UpdateTtpPaymentDto } from './dto/update-ttp_payment.dto';

@Controller('ttp-payment')
export class TtpPaymentController {
  constructor(private readonly ttpPaymentService: TtpPaymentService) {}

  @Post()
  create(@Body() createTtpPaymentDto: CreateTtpPaymentDto) {
    return this.ttpPaymentService.create(createTtpPaymentDto);
  }

  @Get()
  findAll() {
    return this.ttpPaymentService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ttpPaymentService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTtpPaymentDto: UpdateTtpPaymentDto) {
    return this.ttpPaymentService.update(+id, updateTtpPaymentDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ttpPaymentService.remove(+id);
  }
}
