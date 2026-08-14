import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ReportService } from './report.service';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { I18nLang } from 'nestjs-i18n';

@ApiTags('Reports')
@ApiBearerAuth('bearerAuth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('/outbound')
@Controller('report')
export class ReportController {
  constructor(private readonly reportService: ReportService) { }

  @Post('/add-report')
  create(
    @Body() createReportDto: CreateReportDto,
    @I18nLang() lang: string = 'tk',
  ) {
    return this.reportService.addReport(createReportDto, lang);
  }

  @Get('/get-all-report')
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @I18nLang() lang: string = 'tk',
  ) {
    return this.reportService.getAllReports(Number(page), Number(limit), lang);
  }

  @Patch('/update-report')
  async update(
    @Body() updateReportDto: UpdateReportDto,
    @I18nLang() lang: string = 'tk',
  ) {
    return this.reportService.updateReport(updateReportDto, lang);
  }

  @Delete('/delete-report')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        guid: { type: 'string' }
      }
    }
  })
  async remove(
    @Body('guid') guid: string,
    @I18nLang() lang: string = 'tk',
  ) {
    return this.reportService.deleteReport(guid, lang);
  }
}
