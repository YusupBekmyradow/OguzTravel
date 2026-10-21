import { Controller, Get, Post, Body, Patch, Delete, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { I18nLang } from 'nestjs-i18n';
import { VisaDocsService } from './visa_doc.service';
import { UpdateVisaDocDto } from './dto/update-visa_doc.dto';
import { CreateVisaDocDto } from './dto/create-visa_doc.dto';

@ApiTags('VisaDocs')
@ApiBearerAuth('bearerAuth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('/visa/package')
@Controller('visa-docs')
export class VisaDocsController {
  constructor(private readonly visaDocsService: VisaDocsService) { }


  @Get('/get-visa-docs')
  async getAllVisaDocs(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search?: string,
    @I18nLang() lang: string = 'tk',
  ) {
    return this.visaDocsService.getAllVisaDocs(Number(page), Number(limit), { search }, lang);
  }

  @Get('/get-visa-doc/:guid')
  async getOneVisaDoc(@Param('guid') guid: string, @I18nLang() lang: string) {
    return this.visaDocsService.getOneVisaDoc(guid, lang);
  }

  @Post('/add-visa-doc')
  async create(@Body() createVisaDocDto: CreateVisaDocDto, @I18nLang() lang: string) {
    return this.visaDocsService.addVisaDoc(createVisaDocDto, lang);
  }


  @Patch('/update-visa-doc')
  update(
    @Body() updateVisaDocDto: UpdateVisaDocDto,
    @I18nLang() lang: string,
  ) {
    return this.visaDocsService.updateVisaDoc(updateVisaDocDto, lang);
  }


  @Delete('/delete-visa-doc')
  @ApiBody({ schema: { type: 'object', properties: { guid: { type: 'string' } } } })
  remove(@Body('guid') guid: string, @I18nLang() lang: string) {
    return this.visaDocsService.deleteVisaDoc(guid, lang);
  }
}