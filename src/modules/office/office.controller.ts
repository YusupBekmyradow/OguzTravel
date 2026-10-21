import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { OfficeService } from './office.service';
import { CreateOfficeDto } from './dto/create-office.dto';
import { UpdateOfficeDto } from './dto/update-office.dto';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { I18nLang } from 'nestjs-i18n';

@ApiTags('Offices')
@ApiBearerAuth('bearerAuth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('/professional-translation/office')
@Controller('office')
export class OfficeController {
  constructor(private readonly officeService: OfficeService) { }

  @Post('/add-office')
  async create(@Body() createOfficeDto: CreateOfficeDto, @I18nLang() lang: string) {
    return this.officeService.addOffice(createOfficeDto, lang);
  }


  @Get('/get-all-offices')
  async findAll(@I18nLang() lang: string = 'tk') {
    return this.officeService.getAllOffice(lang);
  }


  @Patch('/update-office')
  async update(@Body() updateOfficeDto: UpdateOfficeDto, @I18nLang() lang: string) {
    return this.officeService.updateOffice(updateOfficeDto, lang);
  }

  @Delete('/delete-office')
  @ApiBody({
    schema: {
      type: 'object', properties: {
        guid: { type: 'string' }
      }
    }
  })
  async remove(@Body('guid') guid: string, @I18nLang() lang: string) {
    return this.officeService.deleteOffice(guid, lang);
  }
}


