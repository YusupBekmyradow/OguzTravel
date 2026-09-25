import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { I18nLang } from 'nestjs-i18n';
import { DashboardService } from './dashboard.service';
import { DashboardFilterDto, GetSummaryFilterDto } from './dto/dashboard-filter.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Dashboard')
// @ApiBearerAuth('bearerAuth')
// @UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) { }


  @Get('/get-summary')
  async getSummary(
    @Query() filters: GetSummaryFilterDto,
    @Req() req: any,
    @I18nLang() lang: string = 'tk',
  ) {
    return this.dashboardService.getSummary(filters, req?.user, lang);
  }

  @Get('/get-operators-rating')
  async getOperatorsRating(@Query() filters: DashboardFilterDto, @Req() req: any) {
    return this.dashboardService.getOperatorsRating(filters, req?.user);
  }


  @Get('/get-categories-rating')
  async getCategoryRating(
    @Query() filters: DashboardFilterDto,
    @Req() req: any,
    @I18nLang() lang: string = 'tk',
  ) {
    return this.dashboardService.getCategoryRating(filters, req?.user, lang);
  }

  @Get('/offices-rating')
  async getOfficesRating(@Query() filters: DashboardFilterDto, @Req() req: any, @I18nLang() lang: string = 'tk',) {
    return this.dashboardService.getOfficesRating(filters, req.user, lang);
  }



  @ApiQuery({ name: 'start_date', required: false, type: String })
  @ApiQuery({ name: 'end_date', required: false, type: String })
  @ApiQuery({ name: 'currency', required: false, type: String })
  @Get('/one-offices')
  async getOneOffices(
    @Query() filters: { start_date?: string; end_date?: string; currency?: string },
    @I18nLang() lang: string = 'tk',
  ) {
    return this.dashboardService.getOneOffices(filters, lang);
  }


  @Get('/status-analytics')
  async getStatusAnalytics(
    @Query() filters: DashboardFilterDto,
    @I18nLang() lang: string = 'tk',
  ) {
    return this.dashboardService.getStatusAnalytics(filters, lang);
  }


  @Get('category-detail/:guid')
  async getCategoryDetailAnalytics(
    @Param('guid') guid: string,
    @Query() filters: DashboardFilterDto
  ) {
    return await this.dashboardService.getCategoryDetailAnalytics(
      guid,
      filters,
    );
  }

  @Get('category-detail/:guid/top-operators')
  async getCategoryTopOperators(
    @Param('guid') guid: string,
    @Query() filters: DashboardFilterDto) {
    return await this.dashboardService.getTopOperators(guid, filters);
  }
}

