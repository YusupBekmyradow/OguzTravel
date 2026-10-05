import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { I18nLang } from 'nestjs-i18n';
import { DashboardService } from './dashboard.service';
import { DashboardFilterDto, GetSummaryFilterDto } from './dto/dashboard-filter.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetCategoryAnalyticsFilterDto } from './dto/GetCategoryAnalyticsFilterDto-filter.dto';

// @ApiTags('Dashboard')
// @ApiBearerAuth('bearerAuth')
// @UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) { }


  @Get('/admin-vs-maliya-vs-office-cards')
  async getSummary(@Query() filters: GetSummaryFilterDto) {
    return await this.dashboardService.getDashboardSummary(filters);
  } ///test edilen


  @Get('/admin-vs-maliya-chart-data')
  async getChartData(
    @Query() filters: GetSummaryFilterDto,
    @Query('currency') currency?: 'USD' | 'TMT',
  ) {
    return await this.dashboardService.getDashboardChartData({
      ...filters,
      currency: currency || 'TMT',
    });
  } //test-edilen


  // Money out per period: cost of sales, salaries and kassa expenses.
  @Get('/money-out')
  async getMoneyOut(@Query() filters: GetSummaryFilterDto, @Query('currency') currency?: 'USD' | 'TMT') {
    return await this.dashboardService.getMoneyOut({ ...filters, currency: currency || 'TMT' });
  }


  @Get('/admin-by-status')
  async getStatusSummary(
    @Query() filters: GetSummaryFilterDto,
    @Query('currency') currency?: 'USD' | 'TMT',
  ) {
    return await this.dashboardService.getDashboardStatusSummary({
      ...filters,
      currency: currency || 'TMT',
    });
  } //test-edilen


  @Get('/admin-vs-maliya-operators')
  async getOperatorsRanking(
    @Query() filters: GetCategoryAnalyticsFilterDto,
  ) {
    return await this.dashboardService.getOperatorsRanking(filters);
  } //test-edilen


  @Get('/maliya-by-categories')
  async getCategoriesRanking(
    @Query() filters: GetSummaryFilterDto,
    @Query('currency') currency?: 'USD' | 'TMT',
  ) {
    return await this.dashboardService.getCategoriesRanking({
      ...filters,
      currency: currency || 'TMT',
    });
  } ///test-edilen


  @Get('/offices-by-office')
  async getOfficesSummaryData(
    @Query() filters: GetSummaryFilterDto,
    @Query('currency') currency?: 'USD' | 'TMT',
  ) {
    return await this.dashboardService.getOfficesPerformanceData({
      ...filters,
      currency: currency || 'TMT',
    });
  } ///test-edilen


  @Get('/admin-category-grifik')
  async getCategoryAnalytics(
    @Query() filters: GetCategoryAnalyticsFilterDto) {
    return await this.dashboardService.getCategoryAnalytics(filters);
  }//test-edilen
}

