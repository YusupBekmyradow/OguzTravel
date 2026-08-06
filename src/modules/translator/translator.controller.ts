import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { TranslatorService } from './translator.service';
import { CreateTranslatorDto } from './dto/create-translator.dto';
import { UpdateTranslatorDto } from './dto/update-translator.dto';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { I18nLang } from 'nestjs-i18n';

@ApiTags('Translator')
@ApiBearerAuth('bearerAuth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('/translation')
@Controller('translator')
export class TranslatorController {
  constructor(private readonly translatorService: TranslatorService) { }

  @Post('/add-translator')
  async create(@Body() createDto: CreateTranslatorDto, @I18nLang() lang: string) {
    return this.translatorService.addTranslator(createDto, lang);
  }

  @Get('/get-all-translators')
  async findAll(@I18nLang() lang: string = 'tk') {
    return this.translatorService.getAllTranslators(lang);
  }

  @Patch('/update-translator')
  async update(@Body() updateDto: UpdateTranslatorDto, @I18nLang() lang: string) {
    return this.translatorService.updateTranslator(updateDto, lang);
  }

  @Delete('/delete-translator')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { guid: { type: 'string' } }
    }
  })
  async remove(@Body('guid') guid: string, @I18nLang() lang: string) {
    return this.translatorService.deleteTranslator(guid, lang);
  }
}


