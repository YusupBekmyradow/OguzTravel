import { Controller, Get, Post, Body, Patch, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { I18nLang } from 'nestjs-i18n';
import { InboundReportService } from './inbound_report.service';
import { CreateInboundExpectedDto, UpdateInboundExpectedDto } from './dto/inbound-expected.dto';
import { CreateInboundArrivalDto, UpdateInboundArrivalDto } from './dto/inbound-arrival.dto';
import { CreateInboundInvitationDto, UpdateInboundInvitationDto } from './dto/inbound-invitation.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

const GUID_BODY = { schema: { type: 'object', properties: { guid: { type: 'string' } } } };

@ApiTags('Inbound reports')
@ApiBearerAuth('bearerAuth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('/Inbound')
@Controller('inbound-reports')
export class InboundReportController {
  constructor(private readonly inboundReportService: InboundReportService) { }

  @Get('/get-summary')
  getSummary(
    @Query('search') search?: string,
    @Query('start_date') start_date?: string,
    @Query('end_date') end_date?: string,
    @I18nLang() lang: string = 'tk',
  ) {
    return this.inboundReportService.getSummary({ search, start_date, end_date }, lang);
  }


  @Post('/add-expected')
  addExpected(@Body() dto: CreateInboundExpectedDto, @I18nLang() lang: string) {
    return this.inboundReportService.addExpected(dto, lang);
  }

  @Get('/get-all-expected')
  getAllExpected(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('search') search?: string,
    @Query('start_date') start_date?: string,
    @Query('end_date') end_date?: string,
    @I18nLang() lang: string = 'tk',
  ) {
    return this.inboundReportService.getAllExpected(Number(page), Number(limit), { search, start_date, end_date }, lang);
  }

  @Patch('/update-expected')
  updateExpected(@Body() dto: UpdateInboundExpectedDto, @I18nLang() lang: string) {
    return this.inboundReportService.updateExpected(dto, lang);
  }

  @Delete('/delete-expected')
  @ApiBody(GUID_BODY)
  deleteExpected(@Body('guid') guid: string, @I18nLang() lang: string) {
    return this.inboundReportService.deleteExpected(guid, lang);
  }


  @Post('/add-arrival')
  addArrival(@Body() dto: CreateInboundArrivalDto, @I18nLang() lang: string) {
    return this.inboundReportService.addArrival(dto, lang);
  }

  @Get('/get-all-arrivals')
  getAllArrivals(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('search') search?: string,
    @Query('start_date') start_date?: string,
    @Query('end_date') end_date?: string,
    @I18nLang() lang: string = 'tk',
  ) {
    return this.inboundReportService.getAllArrivals(Number(page), Number(limit), { search, start_date, end_date }, lang);
  }

  @Patch('/update-arrival')
  updateArrival(@Body() dto: UpdateInboundArrivalDto, @I18nLang() lang: string) {
    return this.inboundReportService.updateArrival(dto, lang);
  }

  @Delete('/delete-arrival')
  @ApiBody(GUID_BODY)
  deleteArrival(@Body('guid') guid: string, @I18nLang() lang: string) {
    return this.inboundReportService.deleteArrival(guid, lang);
  }


  @Post('/add-invitation')
  addInvitation(@Body() dto: CreateInboundInvitationDto, @I18nLang() lang: string) {
    return this.inboundReportService.addInvitation(dto, lang);
  }

  @Get('/get-all-invitations')
  getAllInvitations(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('search') search?: string,
    @Query('start_date') start_date?: string,
    @Query('end_date') end_date?: string,
    @I18nLang() lang: string = 'tk',
  ) {
    return this.inboundReportService.getAllInvitations(Number(page), Number(limit), { search, start_date, end_date }, lang);
  }

  @Patch('/update-invitation')
  updateInvitation(@Body() dto: UpdateInboundInvitationDto, @I18nLang() lang: string) {
    return this.inboundReportService.updateInvitation(dto, lang);
  }

  @Delete('/delete-invitation')
  @ApiBody(GUID_BODY)
  deleteInvitation(@Body('guid') guid: string, @I18nLang() lang: string) {
    return this.inboundReportService.deleteInvitation(guid, lang);
  }
}
