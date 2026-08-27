import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { TotalCalculationsService } from './total_calculations.service';
import { CreateTotalCalculationDto } from './dto/create-total_calculation.dto';
import { UpdateTotalCalculationDto } from './dto/update-total_calculation.dto';

@Controller('total-calculations')
export class TotalCalculationsController {
  constructor(private readonly totalCalculationsService: TotalCalculationsService) {}

  @Post()
  create(@Body() createTotalCalculationDto: CreateTotalCalculationDto) {
    return this.totalCalculationsService.create(createTotalCalculationDto);
  }

  @Get()
  findAll() {
    return this.totalCalculationsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.totalCalculationsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTotalCalculationDto: UpdateTotalCalculationDto) {
    return this.totalCalculationsService.update(+id, updateTotalCalculationDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.totalCalculationsService.remove(+id);
  }
}
