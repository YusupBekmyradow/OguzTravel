import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ReportService } from './report.service';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { ApiBearerAuth, ApiBody, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Reports')
@ApiBearerAuth('bearerAuth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('/reports')
@Controller('report')
export class ReportController {
  constructor(private readonly reportService: ReportService) { }

  @Post('/add-report')
  async create(@Body() createReportDto: CreateReportDto) {
    return this.reportService.addReport(createReportDto);
  }

  @Get('/get-all-reports')
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.reportService.getAllReports(page, limit);
  }


  @Patch('/update-report')
  async update(@Body() updateReportDto: UpdateReportDto) {
    return this.reportService.updateReport(updateReportDto);
  }

  @Delete('/delete-report')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        guid: { type: 'string' },
      },
    },
  })
  async remove(@Body('guid') guid: string) {
    return this.reportService.deleteReport(guid);
  }
}
