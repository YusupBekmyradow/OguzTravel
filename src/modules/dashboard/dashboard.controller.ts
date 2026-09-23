import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { I18nLang } from 'nestjs-i18n';
import { DashboardService } from './dashboard.service';
import { DashboardFilterDto } from './dto/dashboard-filter.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../guards/permissions.guard';

@ApiTags('Dashboard')
@ApiBearerAuth('bearerAuth')
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) { }

  @Get('/get-summary')
  @ApiOperation({})
  async getSummary(
    @Query() filters: DashboardFilterDto,
    @Req() req: any,
    @I18nLang() lang: string = 'tk',
  ) {
    return this.dashboardService.getSummary(filters, req?.user, lang);
  }

}
