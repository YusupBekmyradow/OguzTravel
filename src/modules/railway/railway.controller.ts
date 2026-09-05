import { Controller, Get, Post, Body, Patch, Delete, Query, UseGuards } from '@nestjs/common';
import { RailwayService } from './railway.service';
import { CreateRailwayDto } from './dto/create-railway.dto';
import { UpdateRailwayDto } from './dto/update-railway.dto';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { I18nLang } from 'nestjs-i18n';

@ApiTags('Railway')
@ApiBearerAuth('bearerAuth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('/outbound')
@Controller('railway')
export class RailwayController {
  constructor(private readonly railwayService: RailwayService) { }

  @Post('/add-railway')
  async create(@Body() createDto: CreateRailwayDto, @I18nLang() lang: string) {
    return this.railwayService.addRailway(createDto, lang);
  }

  @Get('/get-railways')
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('start_date') start_date?: string,
    @Query('end_date') end_date?: string,
    @Query('opr_guid') opr_guid?: string,
    @Query('prepared_opr_guid') prepared_opr_guid?: string,
    @Query('is_paid') is_paid?: number,
    @Query('system') system?: string,
    @Query('train_type') train_type?: string,
    @Query('ticket_type') ticket_type?: string,
    @I18nLang() lang: string = 'tk',
  ) {
    return this.railwayService.getAllRailway(
      page,
      limit,
      search,
      start_date,
      end_date,
      opr_guid,
      prepared_opr_guid,
      is_paid,
      system,
      train_type,
      ticket_type,
      lang,
    );
  }

  @Patch('/update-railway')
  async update(@Body() updateDto: UpdateRailwayDto, @I18nLang() lang: string) {
    return this.railwayService.updateRailway(updateDto, lang);
  }

  @Delete('/delete-railway')
  @ApiBody({ schema: { type: 'object', properties: { guid: { type: 'string' } } } })
  async remove(@Body('guid') guid: string, @I18nLang() lang: string) {
    return this.railwayService.deleteRailway(guid, lang);
  }
}
