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
  async findAll(@Query('page') page: number = 1, @Query('limit') limit: number = 10, @I18nLang() lang: string = 'tk') {
    return this.airwayService.getAllAirway(Number(page), Number(limit), lang);
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
