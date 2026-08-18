import { Controller, Get, Post, Body, Patch, Delete, Query, UseGuards } from '@nestjs/common';
import { AirwayService } from './airway.service';
import { CreateAirwayDto } from './dto/create-airway.dto';
import { UpdateAirwayDto } from './dto/update-airway.dto';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { I18nLang } from 'nestjs-i18n';

@ApiTags('Airway')
@ApiBearerAuth('bearerAuth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('/outbound')
@Controller('airway')
export class AirwayController {
  constructor(private readonly airwayService: AirwayService) { }

  @Post('/add-airway')
  async create(@Body() createDto: CreateAirwayDto, @I18nLang() lang: string) {
    return this.airwayService.addAirway(createDto, lang);
  }

  @Get('/get-airways')
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('application_date') application_date?: string,
    @Query('opr_guid') opr_guid?: string,
    @Query('prepared_opr_guid') prepared_opr_guid?: string,
    @Query('is_paid') is_paid?: number,
    @Query('system') system?: string,
    @Query('ticket_type') ticket_type?: string,
    @I18nLang() lang: string = 'tk',) {
    return this.airwayService.getAllAirway(page,
      limit,
      search,
      application_date,
      opr_guid,
      prepared_opr_guid,
      is_paid,
      system,
      ticket_type,
      lang,);
  }

  @Patch('/update-airway')
  async update(@Body() updateDto: UpdateAirwayDto, @I18nLang() lang: string) {
    return this.airwayService.updateAirway(updateDto, lang);
  }

  @Delete('/delete-airway')
  @ApiBody({ schema: { type: 'object', properties: { guid: { type: 'string' } } } })
  async remove(@Body('guid') guid: string, @I18nLang() lang: string) {
    return this.airwayService.deleteAirway(guid, lang);
  }
}
