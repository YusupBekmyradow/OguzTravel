import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { TurkishAirlinesService } from './turkish_airlines.service';
import { CreateTurkishAirlineDto } from './dto/create-turkish_airline.dto';
import { UpdateTurkishAirlineDto } from './dto/update-turkish_airline.dto';
import { ApiBody, ApiTags } from '@nestjs/swagger';

@ApiTags('TurkishAirliens')
@Controller('turkish-airlines')
export class TurkishAirlinesController {
  constructor(private readonly turkishAirlinesService: TurkishAirlinesService) { }

  @Post('/add-turkish-airlines')
  async create(@Body() createTurkishAirlineDto: CreateTurkishAirlineDto) {
    return this.turkishAirlinesService.addTurkishAirline(createTurkishAirlineDto);
  }

  @Get('/get-tukish-airlines-report')
  async getReport(@Query('year_month') year_month: string) {
    return this.turkishAirlinesService.getTurkishReport(year_month);
  }

  @Get('/get-all-turkish-airlines')
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.turkishAirlinesService.getAllTurkishAirline(Number(page), Number(limit));
  }

  @Patch('/update-turkish-airlines')
  update(@Body() updateTurkishAirlineDto: UpdateTurkishAirlineDto) {
    return this.turkishAirlinesService.updateTurkishAirline(updateTurkishAirlineDto);
  }

  @Delete('/delete-turkish-airlines')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        guid: { type: 'string' }
      }
    }
  })
  remove(@Body('guid') guid: string) {
    return this.turkishAirlinesService.deleteTurkishAirline(guid);
  }
}
