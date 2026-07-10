import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { TurkishAirlinesService } from './turkish_airlines.service';
import { CreateTurkishAirlineDto } from './dto/create-turkish_airline.dto';
import { UpdateTurkishAirlineDto } from './dto/update-turkish_airline.dto';

@Controller('turkish-airlines')
export class TurkishAirlinesController {
  constructor(private readonly turkishAirlinesService: TurkishAirlinesService) {}

  @Post()
  create(@Body() createTurkishAirlineDto: CreateTurkishAirlineDto) {
    return this.turkishAirlinesService.create(createTurkishAirlineDto);
  }

  @Get()
  findAll() {
    return this.turkishAirlinesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.turkishAirlinesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTurkishAirlineDto: UpdateTurkishAirlineDto) {
    return this.turkishAirlinesService.update(+id, updateTurkishAirlineDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.turkishAirlinesService.remove(+id);
  }
}
