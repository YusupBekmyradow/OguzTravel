import { Controller, Get, Post, Body, Patch, Delete, Query, UseGuards } from '@nestjs/common';
import { RefferalLetterService } from './refferal_letter.service';
import { CreateRefferalLetterDto } from './dto/create-refferal_letter.dto';
import { UpdateRefferalLetterDto } from './dto/update-refferal_letter.dto';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { I18nLang } from 'nestjs-i18n';

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
    @Query('received_opr_guid') received_opr_guid?: string,
    @Query('departure_date') departure_date?: string,
    @Query('return_date') return_date?: string,
    @Query('contract_date') contract_date?: string,
    @I18nLang() lang: string = 'tk',
  ) {
    const filters = { received_opr_guid, departure_date, return_date, contract_date };
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
}
