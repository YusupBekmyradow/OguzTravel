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
import { ReportShareService } from './report_share.service';
import { CreateReportShareDto } from './dto/create-report_share.dto';
import { UpdateReportShareDto } from './dto/update-report_share.dto';
import { ApiBearerAuth, ApiBody, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Report Share')
@ApiBearerAuth('bearerAuth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('/reports')
@Controller('report-share')
export class ReportShareController {
  constructor(private readonly reportShareService: ReportShareService) { }

  @Post('/add-report-share')
  async create(@Body() createReportShareDto: CreateReportShareDto) {
    return this.reportShareService.addReportShare(createReportShareDto);
  }

  @Get('/get-all-report-shares')
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({ name: 'assignment_opr_guid', required: false })
  @ApiQuery({ name: 'receiver_opr_guid', required: false })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('assignment_opr_guid') assignment_opr_guid?: string,
    @Query('receiver_opr_guid') receiver_opr_guid?: string,
  ) {
    return this.reportShareService.getAllReportShares(
      page,
      limit,
      assignment_opr_guid,
      receiver_opr_guid,
    );
  }

  @Patch('/update-report-share')
  async update(@Body() updateReportShareDto: UpdateReportShareDto) {
    return this.reportShareService.updateReportShare(updateReportShareDto);
  }

  @Delete('/delete-report-share')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        guid: { type: 'string' },
      },
    },
  })
  async remove(@Body('guid') guid: string) {
    return this.reportShareService.deleteReportShare(guid);
  }
}
