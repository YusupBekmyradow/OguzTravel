import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { VisaCategoryService } from './visa_category.service';
import { CreateVisaCategoryDto } from './dto/create-visa_category.dto';
import { UpdateVisaCategoryDto } from './dto/update-visa_category.dto';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { I18nLang } from 'nestjs-i18n';

@ApiTags('Visa Categories')
@ApiBearerAuth('bearerAuth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('/visa/applications', '/visa/package')
@Controller('visa-category')
export class VisaCategoryController {
  constructor(private readonly visaCategoryService: VisaCategoryService) { }

  @Post('/add-visa-category')
  async create(@Body() createDto: CreateVisaCategoryDto, @I18nLang() lang: string) {
    return this.visaCategoryService.addVisaCategory(createDto, lang);
  }

  @Get('/get-all-visa-categories')
  async findAll(@I18nLang() lang: string = 'tk') {
    return this.visaCategoryService.getAllVisaCategories(lang);
  }

  @Patch('/update-visa-category')
  async update(@Body() updateDto: UpdateVisaCategoryDto, @I18nLang() lang: string) {
    return this.visaCategoryService.updateVisaCategory(updateDto, lang);
  }

  @Delete('/delete-visa-category')
  @ApiBody({
    schema: { type: 'object', properties: { guid: { type: 'string' } } }
  })
  async remove(@Body('guid') guid: string, @I18nLang() lang: string) {
    return this.visaCategoryService.deleteVisaCategory(guid, lang);
  }
}


