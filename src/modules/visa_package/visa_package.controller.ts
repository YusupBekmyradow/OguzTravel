import { Controller, Get, Post, Body, Patch, Delete, Query, UseGuards } from '@nestjs/common';
import { VisaPackageService } from './visa_package.service';
import { CreateVisaPackageDto } from './dto/create-visa_package.dto';
import { UpdateVisaPackageDto } from './dto/update-visa_package.dto';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { I18nLang } from 'nestjs-i18n';

@ApiTags('Visa Packages')
@ApiBearerAuth('bearerAuth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('/visa/package')
@Controller('visa-package')
export class VisaPackageController {
  constructor(private readonly visaPackageService: VisaPackageService) { }

  @Post('/add-visa-package')
  async create(
    @Body() createDto: CreateVisaPackageDto,
    @I18nLang() lang: string,
  ) {
    return this.visaPackageService.addVisaPackage(createDto, lang);
  }

  @Get('/get-visa-packages-byindex')
  async findAll(
    @Query('index') index: number,
    @I18nLang() lang: string = 'tk',
  ) {
    return this.visaPackageService.getAllVisaPackages(Number(index), lang);
  }

  @Get('/get-visa-packages')
  async find(@I18nLang() lang: string = 'tk') {
    return this.visaPackageService.getAllVisaPack(lang);
  }

  @Patch('/update-visa-package')
  async update(
    @Body() updateDto: UpdateVisaPackageDto,
    @I18nLang() lang: string,
  ) {
    return this.visaPackageService.updateVisaPackage(updateDto, lang);
  }

  @Delete('/delete-visa-package')
  @ApiBody({ schema: { type: 'object', properties: { guid: { type: 'string' } } } })
  async remove(
    @Body('guid') guid: string,
    @I18nLang() lang: string,
  ) {
    return this.visaPackageService.deleteVisaPackage(guid, lang);
  }
}
