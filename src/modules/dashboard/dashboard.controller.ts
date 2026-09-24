import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
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

  @ApiOperation({ summary: 'Get financial summary cards and dynamic trend chart' })
  @Get('/get-summary')
  async getSummary(
    @Query() filters: GetSummaryFilterDto,
    @Req() req: any,
    @I18nLang() lang: string = 'tk',
  ) {
    return this.dashboardService.getSummary(filters, req?.user, lang);
  }

  @ApiOperation({ summary: 'Get operator sales and performance rating' })
  @Get('/get-operators-rating')
  async getOperatorsRating(@Query() filters: DashboardFilterDto, @Req() req: any) {
    return this.dashboardService.getOperatorsRating(filters, req?.user);
  }

  @ApiOperation({ summary: 'Get category sales and margin statistics' })
  @Get('/get-categories-rating')
  async getCategoryRating(
    @Query() filters: DashboardFilterDto,
    @Req() req: any,
    @I18nLang() lang: string = 'tk',
  ) {
    return this.dashboardService.getCategoryRating(filters, req?.user, lang);
  }
}

