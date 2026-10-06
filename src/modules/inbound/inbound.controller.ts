import { Controller, Get, Post, Body, Patch, Delete, Query, UseGuards } from '@nestjs/common';
import { InboundService } from './inbound.service';
import { CreateInboundDto } from './dto/create-inbound.dto';
import { UpdateInboundDto } from './dto/update-inbound.dto';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { I18nLang } from 'nestjs-i18n';

@ApiTags('Inbound')
@ApiBearerAuth('bearerAuth')
@UseGuards(JwtAuthGuard)
@Controller('inbound')
export class InboundController {
  constructor(private readonly inboundService: InboundService) { }

  @Post('/add-inbound')
  async create(
    @Body() createInboundDto: CreateInboundDto,
    @I18nLang() lang: string,
  ) {
    return this.inboundService.addInbound(createInboundDto, lang);
  }

  @Get('/get-all-inbound')
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @I18nLang() lang: string = 'tk',
  ) {
    return this.inboundService.getAllInbound(Number(page), Number(limit), lang);
  }

  @Patch('/update-inbound')
  async update(
    @Body() updateInboundDto: UpdateInboundDto,
    @I18nLang() lang: string,
  ) {
    return this.inboundService.updateInbound(updateInboundDto, lang);
  }

  @Delete('/delete-inbound')
  @ApiBody({ schema: { type: 'object', properties: { guid: { type: 'string' } } } })
  async remove(
    @Body('guid') guid: string,
    @I18nLang() lang: string,
  ) {
    return this.inboundService.deleteInbound(guid, lang);
  }
}
