import { Controller, Get, Post, Body, Patch, Delete, UseGuards } from '@nestjs/common';
import { TstatusService } from './tstatus.service';
import { CreateTstatusDto } from './dto/create-tstatus.dto';
import { UpdateTstatusDto } from './dto/update-tstatus.dto';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { I18nLang } from 'nestjs-i18n';

@ApiTags('TicketStatus')
@ApiBearerAuth('bearerAuth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('tstatus')
export class TstatusController {
  constructor(private readonly tstatusService: TstatusService) { }

  @Post('/add-tstatus')
  async create(@Body() createTstatusDto: CreateTstatusDto, @I18nLang() lang: string) {
    return this.tstatusService.addTstatus(createTstatusDto, lang);
  }

  @Get('/get-all-tstatus')
  async findAll(@I18nLang() lang: string = 'tk') {
    return this.tstatusService.getAllTstatus(lang);
  }

  @Patch('/update-tstatus')
  async update(@Body() updateTstatusDto: UpdateTstatusDto, @I18nLang() lang: string) {
    return this.tstatusService.updateTstatus(updateTstatusDto, lang);
  }

  @Delete('/delete-tstatus')
  @ApiBody({ schema: { type: 'object', properties: { guid: { type: 'string' } } } })
  async remove(@Body('guid') guid: string, @I18nLang() lang: string) {
    return this.tstatusService.deleteTstatus(guid, lang);
  }
}
