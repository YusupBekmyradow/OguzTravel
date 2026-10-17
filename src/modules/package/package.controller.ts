import { Controller, Get, Post, Body, Patch, Delete, Query, UseGuards } from '@nestjs/common';
import { PackageService } from './package.service';
import { CreatePackageDto } from './dto/create-package.dto';
import { UpdatePackageDto } from './dto/update-package.dto';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { I18nLang } from 'nestjs-i18n';

@ApiTags('Package')
@ApiBearerAuth('bearerAuth')
@UseGuards(JwtAuthGuard)
@Controller('package')
export class PackageController {
  constructor(private readonly packageService: PackageService) { }

  @Post('/add-package')
  async create(@Body() createDto: CreatePackageDto, @I18nLang() lang: string) {
    return this.packageService.addPackage(createDto, lang);
  }


  @Get('/get-packages')
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('start_date') start_date?: string,
    @Query('end_date') end_date?: string,
    @Query('opr_guid') opr_guid?: string,
    @Query('prepared_opr_guid') prepared_opr_guid?: string,
    @Query('is_paid') is_paid?: number,
    @I18nLang() lang: string = 'tk',
  ) {
    return this.packageService.getAllPackage(
      page,
      limit,
      search,
      start_date,
      end_date,
      opr_guid,
      prepared_opr_guid,
      is_paid,
      lang,
    );
  }

  @Patch('/update-package')
  async update(@Body() updateDto: UpdatePackageDto, @I18nLang() lang: string) {
    return this.packageService.updatePackage(updateDto, lang);
  }

  @Delete('/delete-package')
  @ApiBody({ schema: { type: 'object', properties: { guid: { type: 'string' } } } })
  async remove(@Body('guid') guid: string, @I18nLang() lang: string) {
    return this.packageService.deletePackage(guid, lang);
  }
}
