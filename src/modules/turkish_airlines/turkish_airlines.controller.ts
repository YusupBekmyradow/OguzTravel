import { Controller, Get, Post, Body, Patch, Delete, Query, UseGuards } from '@nestjs/common';
import { TurkishAirlinesService } from './turkish_airlines.service';
import { CreateTurkishAirlineDto } from './dto/create-turkish_airline.dto';
import { UpdateTurkishAirlineDto } from './dto/update-turkish_airline.dto';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { I18nLang } from 'nestjs-i18n';

@ApiTags('TurkishAirliens')
@ApiBearerAuth('bearerAuth')
@UseGuards(JwtAuthGuard)
@Controller('turkish-airlines')
export class TurkishAirlinesController {
  constructor(private readonly turkishAirlinesService: TurkishAirlinesService) { }

  @Post('/add-turkish-airlines')
  async create(@Body() createTurkishAirlineDto: CreateTurkishAirlineDto, @I18nLang() lang: string) {
    return this.turkishAirlinesService.addTurkishAirline(createTurkishAirlineDto, lang);
  }

  @Get('/get-tukish-airlines-report')
  async getReport(@Query('year_month') year_month: string, @I18nLang() lang: string = 'tk') {
    return this.turkishAirlinesService.getTurkishReport(year_month, lang);
  }

  @Get('/get-tukish-airlines')
  async getAllTurkishAirline(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search?: string,
    @Query('start_date') start_date?: string,
    @Query('end_date') end_date?: string,
    @Query('assignment_opr_guid') assignment_opr_guid?: string,
    @Query('receiver_opr_guid') receiver_opr_guid?: string,
    @Query('status_guid') status_guid?: string,
    @Query('flight_date') flight_date?: string,
    @Query('is_paid') is_paid?: boolean | string,
    @Query('office_guid') office_guid?: string,
    @I18nLang() lang: string = 'tk',
  ) {
    const filters = { search, start_date, end_date, assignment_opr_guid, receiver_opr_guid, status_guid, flight_date, is_paid, office_guid };
    return await this.turkishAirlinesService.getAllTurkishAirline(Number(page), Number(limit), filters, lang);
  }

  @Get('/get-turkish-status-month')
  async getStatusReportByMonth(@Query('yearMonth') yearMonth: string, @I18nLang() lang: string = 'tk') {
    return await this.turkishAirlinesService.getStatusReportByMonth(yearMonth, lang);
  }

  @Get('get-turkish-quarter')
  async getQuarterReport(@Query('quarter') quarter: number, @I18nLang() lang: string = 'tk') {
    return await this.turkishAirlinesService.getQuarterTurkishAirline(quarter, lang);
  }

  @Patch('/update-turkish-airlines')
  update(@Body() updateTurkishAirlineDto: UpdateTurkishAirlineDto, @I18nLang() lang: string) {
    return this.turkishAirlinesService.updateTurkishAirline(updateTurkishAirlineDto, lang);
  }

  @Delete('/delete-turkish-airlines')
  @ApiBody({ schema: { type: 'object', properties: { guid: { type: 'string' } } } })
  remove(@Body('guid') guid: string, @I18nLang() lang: string) {
    return this.turkishAirlinesService.deleteTurkishAirline(guid, lang);
  }
}

