import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditLogService } from './audit_log.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';

@ApiTags('Audit Logs')
@ApiBearerAuth('bearerAuth')
@UseGuards(JwtAuthGuard)
@Controller('audit-log')
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) { }


  @Get('/list')
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'user_guid', required: false, type: String })
  @ApiQuery({ name: 'action', required: false, enum: ['CREATE', 'UPDATE', 'DELETE'] })
  @ApiQuery({ name: 'module', required: false, type: String })
  @ApiQuery({
    name: 'from_date',
    required: false,
    type: String,
    description: 'Sene ýa-da wagt (mysal: 2026-10-24, 2026-10-24 14:00, 2026-10-24T14:00:00)',
    example: '2026-10-24',
  })
  @ApiQuery({
    name: 'to_date',
    required: false,
    type: String,
    description: 'Sene ýa-da wagt (mysal: 2026-10-24, 2026-10-24 18:30, 2026-10-24T23:59:59)',
    example: '2026-10-24',
  })
  async getLogs(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('user_guid') user_guid?: string,
    @Query('action') action?: string,
    @Query('module') module?: string,
    @Query('from_date') from_date?: string,
    @Query('to_date') to_date?: string,
  ) {
    return this.auditLogService.getLogs(Number(page), Number(limit), {
      user_guid,
      action,
      module,
      from_date,
      to_date,
    });
  }
}
