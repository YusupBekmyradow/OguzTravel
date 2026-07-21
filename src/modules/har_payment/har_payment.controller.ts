import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { HarPaymentService } from './har_payment.service';
import { CreateHarPaymentDto } from './dto/create-har_payment.dto';
import { UpdateHarPaymentDto } from './dto/update-har_payment.dto';

@Controller('har-payment')
export class HarPaymentController {
  constructor(private readonly harPaymentService: HarPaymentService) {}

  @Post()
  create(@Body() createHarPaymentDto: CreateHarPaymentDto) {
    return this.harPaymentService.create(createHarPaymentDto);
  }

  @Get()
  findAll() {
    return this.harPaymentService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.harPaymentService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateHarPaymentDto: UpdateHarPaymentDto) {
    return this.harPaymentService.update(+id, updateHarPaymentDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.harPaymentService.remove(+id);
  }
}
