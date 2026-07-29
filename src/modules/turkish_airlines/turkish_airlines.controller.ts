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


  @Get('/get-tukish-airlines')
  async getAllTurkishAirline(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('datetime') datetime?: string,
    @Query('assignment_opr_guid') assignment_opr_guid?: string,
    @Query('receiver_opr_guid') receiver_opr_guid?: string,
    @Query('status_guid') status_guid?: string,
    @Query('flight_date') flight_date?: string,
    @Query('is_paid') is_paid?: boolean | string,
    @Query('office_guid') office_guid?: string,
  ) {
    const filters = {
      datetime,
      assignment_opr_guid,
      receiver_opr_guid,
      status_guid,
      flight_date,
      is_paid,
      office_guid,
    };

    return await this.turkishAirlinesService.getAllTurkishAirline(
      Number(page),
      Number(limit),
      filters,
    );
  }


  @Get('/get-turkish-status-month')
  async getStatusReportByMonth(@Query('yearMonth') yearMonth: string) {
    return await this.turkishAirlinesService.getStatusReportByMonth(yearMonth);
  }

  @Get('get-turkish-quarter')
  async getQuarterReport(@Query('quarter') quarter: number) {
    return await this.turkishAirlinesService.getQuarterTurkishAirline(quarter);
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
