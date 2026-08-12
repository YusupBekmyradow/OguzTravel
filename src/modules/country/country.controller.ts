import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { CountryService } from './country.service';
import { CreateCountryDto } from './dto/create-country.dto';
import { UpdateCountryDto } from './dto/update-country.dto';
import { ApiBearerAuth, ApiBody, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { I18nLang } from 'nestjs-i18n';

@ApiTags('Countries')
// @ApiBearerAuth('bearerAuth')
// @UseGuards(JwtAuthGuard, PermissionsGuard)
// @RequirePermissions('/intake', '/visa/applications', '/employee')
@Controller(['countries'])
export class CountryController {
  constructor(private readonly countryService: CountryService) { }

  @Post('/add-country')
  async create(@Body() createCountryDto: CreateCountryDto, @I18nLang() lang: string) {
    return this.countryService.addCountry(createCountryDto, lang);
  }

  @Get('/get-all-countries')
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search?: string,
    @I18nLang() lang: string = 'tk',
  ) {
    return this.countryService.getAllCountry(Number(page), Number(limit), search, lang);
  }


  @Patch('/update-country')
  async update(@Body() updateCountryDto: UpdateCountryDto, @I18nLang() lang: string) {
    return this.countryService.updateCountry(updateCountryDto, lang);
  }


  @Delete('/delete-country')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        guid: { type: 'string' },
      },
    },
  })
  async remove(@Body('guid') guid: string, @I18nLang() lang: string) {
    return this.countryService.deleteCountry(guid, lang);
  }
}
