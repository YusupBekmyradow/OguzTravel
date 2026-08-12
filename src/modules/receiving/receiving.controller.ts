import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ReceivingService } from './receiving.service';
import { CreateReceivingDto } from './dto/create-receiving.dto';
import { UpdateReceivingDto } from './dto/update-receiving.dto';
import { ApiBearerAuth, ApiBody, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { I18nLang } from 'nestjs-i18n';

@ApiTags('Receivings')
// @ApiBearerAuth('bearerAuth')
// @UseGuards(JwtAuthGuard, PermissionsGuard)
// @RequirePermissions('/intake', '/visa/applications')
@Controller('receivings')
export class ReceivingController {
  constructor(private readonly receivingService: ReceivingService) { }

  @Post('/add-receiving')
  async create(
    @Body() createReceivingDto: CreateReceivingDto,
    @I18nLang() lang: string = 'tk',
  ) {
    return this.receivingService.addReceiving(createReceivingDto, lang);
  }


  @Get('/get-all-receivings')
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'country_guid', required: false, type: String })
  @ApiQuery({ name: 'office_guid', required: false, type: String })
  @ApiQuery({ name: 'operator_guid', required: false, type: String })
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('country_guid') country_guid?: string,
    @Query('office_guid') office_guid?: string,
    @Query('operator_guid') operator_guid?: string,
    @I18nLang() lang: string = 'tk',
  ) {
    const filters = { country_guid, office_guid, operator_guid };
    return this.receivingService.getAllReceiving(Number(page), Number(limit), filters, lang);
  }


  @Patch('/update-receiving')
  async update(
    @Body() updateReceivingDto: UpdateReceivingDto,
    @I18nLang() lang: string = 'tk',
  ) {
    return this.receivingService.updateReceiving(updateReceivingDto, lang);
  }


  @Delete('/delete-receiving')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        guid: { type: 'string' },
      },
    },
  })
  async remove(
    @Body('guid') bodyGuid: string,
    @I18nLang() lang: string = 'tk',
  ) {
    return this.receivingService.deleteReceiving(bodyGuid, lang);
  }
}
