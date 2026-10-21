import { Controller, Get, Post, Body, Patch, Delete, Query, UseGuards } from '@nestjs/common';
import { VisaService } from './visa.service';
import { CreateVisaDto } from './dto/create-visa.dto';
import { UpdateVisaDto } from './dto/update-visa.dto';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { I18nLang } from 'nestjs-i18n';
import { FilterVisaDto } from './dto/get-visas.dto';

@ApiTags('Visa')
@ApiBearerAuth('bearerAuth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('/visa/applications')
@Controller('visa')
export class VisaController {
  constructor(private readonly visaService: VisaService) { }

  @Post('/add-visa')
  async create(@Body() createVisaDto: CreateVisaDto, @I18nLang() lang: string) {
    return this.visaService.addVisa(createVisaDto, lang);
  }

  @Get('/get-visa')
  async findAll(@Query() query: FilterVisaDto, @I18nLang() lang: string = 'tk') {
    return this.visaService.getAllVisa(query, lang);
  }

  @Patch('/update-visa')
  update(@Body() updateVisaDto: UpdateVisaDto, @I18nLang() lang: string) {
    return this.visaService.updateVisa(updateVisaDto, lang);
  }

  @Delete('/delete-visa')
  @ApiBody({ schema: { type: 'object', properties: { guid: { type: 'string' } } } })
  remove(@Body('guid') guid: string, @I18nLang() lang: string) {
    return this.visaService.deleteVisa(guid, lang);
  }
}
