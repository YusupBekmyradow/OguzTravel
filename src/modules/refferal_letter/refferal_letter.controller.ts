import { Controller, Get, Post, Body, Patch, Delete, Query, UseGuards } from '@nestjs/common';
import { RefferalLetterService } from './refferal_letter.service';
import { CreateRefferalLetterDto } from './dto/create-refferal_letter.dto';
import { UpdateRefferalLetterDto } from './dto/update-refferal_letter.dto';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { I18nLang } from 'nestjs-i18n';
import { CreateOtherLetterDto } from './dto/sub_report.dto';
import { UpdateOtherLetterDto } from './dto/sub_report_update.dto';

@ApiTags('Refferal_Letter')
@ApiBearerAuth('bearerAuth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('/referal-letters')
@Controller('refferal-letter')
export class RefferalLetterController {
  constructor(private readonly refferalLetterService: RefferalLetterService) { }

  @Post('/add-refferal-letter')
  async create(
    @Body() createDto: CreateRefferalLetterDto,
    @I18nLang() lang: string,
  ) {
    return this.refferalLetterService.addRefferalLetter(createDto, lang);
  }

  @Get('/get-all-refferal-letter')
  async getAllRefferalLetter(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search?: string,
    @Query('received_opr_guid') received_opr_guid?: string,
    @Query('start_departure_date') start_departure_date?: string,
    @Query('end_departure_date') end_departure_date?: string,
    @Query('start_return_date') start_return_date?: string,
    @Query('end_return_date') end_return_date?: string,
    @Query('start_contract_date') start_contract_date?: string,
    @Query('end_contract_date') end_contract_date?: string,
    @Query('status') status?: string,
    @Query('refferal_country_guid') refferal_country_guid?: string,
    @I18nLang() lang: string = 'tk',
  ) {
    const filters = { search, received_opr_guid, start_departure_date, end_departure_date, start_return_date, end_return_date, start_contract_date, end_contract_date, status, refferal_country_guid };
    return await this.refferalLetterService.getAllRefferalLetter(Number(page), Number(limit), filters, lang);
  }

  @Patch('/update-refferal-letter')
  async update(
    @Body() updateDto: UpdateRefferalLetterDto,
    @I18nLang() lang: string,
  ) {
    return this.refferalLetterService.updateRefferalLetter(updateDto, lang);
  }

  @Delete('/delete-refferal-letter')
  @ApiBody({ schema: { type: 'object', properties: { guid: { type: 'string' } } } })
  async remove(
    @Body('guid') guid: string,
    @I18nLang() lang: string,
  ) {
    return this.refferalLetterService.deleteRefferalLetter(guid, lang);
  }




  @Post('/add-other-letter')
  async createOtherLetter(
    @Body() createDto: CreateOtherLetterDto,
    @I18nLang() lang: string,
  ) {
    return this.refferalLetterService.addOtherLetter(createDto, lang);
  }

  @Get('/get-all-other-letter')
  async getAllOtherLetters(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search?: string,
    @Query('received_opr_guid') received_opr_guid?: string,
    @Query('start_date_time') start_date_time?: string,
    @Query('end_date_time') end_date_time?: string,
    @Query('status') status?: string,
    @I18nLang() lang: string = 'tk',
  ) {
    const filters = { search, received_opr_guid, start_date_time, end_date_time, status };
    return await this.refferalLetterService.getAllOtherLetters(Number(page), Number(limit), filters, lang);
  }

  @Patch('/update-other-letter')
  async updateOtherLetter(
    @Body() updateDto: UpdateOtherLetterDto,
    @I18nLang() lang: string,
  ) {
    return this.refferalLetterService.updateOtherLetter(updateDto, lang);
  }

  @Delete('/delete-other-letter')
  @ApiBody({ schema: { type: 'object', properties: { guid: { type: 'string' } } } })
  async removeOtherLetter(
    @Body('guid') guid: string,
    @I18nLang() lang: string,
  ) {
    return this.refferalLetterService.deleteOtherLetter(guid, lang);
  }

  @Get('/get-by-document-number-range')
  async getLettersByDocumentNumberRange(
    @Query('start_number') start_number: number,
    @Query('end_number') end_number: number,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @I18nLang() lang: string = 'tk',
  ) {
    return this.refferalLetterService.getLettersByDocumentNumberRange(
      Number(start_number),
      Number(end_number),
      Number(page),
      Number(limit),
      lang,
    );
  }
}
