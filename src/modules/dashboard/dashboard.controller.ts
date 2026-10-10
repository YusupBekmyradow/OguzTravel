import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { I18nLang, I18nService } from 'nestjs-i18n';
import { DashboardService } from './dashboard.service';
import { GetSummaryFilterDto } from './dto/dashboard-filter.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetCategoryAnalyticsFilterDto } from './dto/GetCategoryAnalyticsFilterDto-filter.dto';
import { successResponse } from '../../helpers/responseFunctions';

@ApiTags('Dashboard')
@ApiBearerAuth('bearerAuth')
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly i18n: I18nService,
  ) { }

  @Get('/admin-vs-maliya-vs-office-cards')
  async getSummary(
    @Query() filters: GetSummaryFilterDto,
    @I18nLang() lang: string = 'tk',
  ) {
    const data = await this.dashboardService.getDashboardSummary(filters);
    return successResponse(200, data, this.i18n.t('dashboard.fetched', { lang }) || 'Dashboard data fetched');
  }

  @Get('/admin-vs-maliya-chart-data')
  async getChartData(
    @Query() filters: GetSummaryFilterDto,
    @Query('currency') currency?: 'USD' | 'TMT',
    @I18nLang() lang: string = 'tk',
  ) {
    const data = await this.dashboardService.getDashboardChartData({
      ...filters,
      currency: currency || 'TMT',
    });
    return successResponse(200, data, this.i18n.t('dashboard.fetched', { lang }) || 'Dashboard data fetched');
  }

  @Get('/money-out')
  async getMoneyOut(
    @Query() filters: GetSummaryFilterDto,
    @Query('currency') currency?: 'USD' | 'TMT',
    @I18nLang() lang: string = 'tk',
  ) {
    const data = await this.dashboardService.getMoneyOut({ ...filters, currency: currency || 'TMT' });
    return successResponse(200, data, this.i18n.t('dashboard.fetched', { lang }) || 'Dashboard data fetched');
  }

  @Get('/admin-by-status')
  async getStatusSummary(
    @Query() filters: GetSummaryFilterDto,
    @Query('currency') currency?: 'USD' | 'TMT',
    @I18nLang() lang: string = 'tk',
  ) {
    const data = await this.dashboardService.getDashboardStatusSummary({
      ...filters,
      currency: currency || 'TMT',
    });
    return successResponse(200, data, this.i18n.t('dashboard.fetched', { lang }) || 'Dashboard data fetched');
  }

  @Get('/admin-vs-maliya-operators')
  async getOperatorsRanking(
    @Query() filters: GetCategoryAnalyticsFilterDto,
    @I18nLang() lang: string = 'tk',
  ) {
    const data = await this.dashboardService.getOperatorsRanking(filters);
    return successResponse(200, data, this.i18n.t('dashboard.fetched', { lang }) || 'Dashboard data fetched');
  }

  @Get('/maliya-by-categories')
  async getCategoriesRanking(
    @Query() filters: GetSummaryFilterDto,
    @Query('currency') currency?: 'USD' | 'TMT',
    @I18nLang() lang: string = 'tk',
  ) {
    const data = await this.dashboardService.getCategoriesRanking({
      ...filters,
      currency: currency || 'TMT',
    });
    return successResponse(200, data, this.i18n.t('dashboard.fetched', { lang }) || 'Dashboard data fetched');
  }

  @Get('/offices-by-office')
  async getOfficesSummaryData(
    @Query() filters: GetSummaryFilterDto,
    @Query('currency') currency?: 'USD' | 'TMT',
    @I18nLang() lang: string = 'tk',
  ) {
    const data = await this.dashboardService.getOfficesPerformanceData({
      ...filters,
      currency: currency || 'TMT',
    });
    return successResponse(200, data, this.i18n.t('dashboard.fetched', { lang }) || 'Dashboard data fetched');
  }

  @Get('/admin-category-grifik')
  async getCategoryAnalytics(
    @Query() filters: GetCategoryAnalyticsFilterDto,
    @I18nLang() lang: string = 'tk',
  ) {
    const data = await this.dashboardService.getCategoryAnalytics(filters);
    return successResponse(200, data, this.i18n.t('dashboard.fetched', { lang }) || 'Dashboard data fetched');
  }
}
