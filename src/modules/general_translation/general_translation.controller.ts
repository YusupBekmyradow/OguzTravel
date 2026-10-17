import { Controller, Get, Post, Body, Patch, Delete, Query, UseGuards } from '@nestjs/common';
import { GeneralTranslationService } from './general_translation.service';
import { CreateGeneralTranslationDto } from './dto/create-general_translation.dto';
import { UpdateGeneralTranslationDto } from './dto/update-general_translation.dto';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { FilterGeneralTranslationDto } from './dto/get-general-translations.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { I18nLang } from 'nestjs-i18n';

@ApiTags('General Translation')
@ApiBearerAuth('bearerAuth')
@UseGuards(JwtAuthGuard)
@Controller('general-translation')
export class GeneralTranslationController {
  constructor(private readonly translationService: GeneralTranslationService) { }

  @Post('/add-translation')
  async create(
    @Body() createDto: CreateGeneralTranslationDto,
    @I18nLang() lang: string,
  ) {
    return this.translationService.addGeneralTranslation(createDto, lang);
  }

  @Get('/get-translations')
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @I18nLang() lang: string = 'tk',
  ) {
    return this.translationService.getAllGeneralTranslation(Number(page), Number(limit), lang);
  }

  @Get('/get-trans-search-filter')
  async searchAndFilter(
    @Query() query: FilterGeneralTranslationDto,
    @I18nLang() lang: string = 'tk',
  ) {
    return await this.translationService.searchAndFilterTranslations(query, lang);
  }

  @Patch('/update-translation')
  async update(
    @Body() updateDto: UpdateGeneralTranslationDto,
    @I18nLang() lang: string,
  ) {
    return this.translationService.updateGeneralTranslation(updateDto, lang);
  }

  @Delete('/delete-translation')
  @ApiBody({ schema: { type: 'object', properties: { guid: { type: 'string' } } } })
  async remove(
    @Body('guid') guid: string,
    @I18nLang() lang: string,
  ) {
    return this.translationService.deleteGeneralTranslation(guid, lang);
  }
}

