import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { CountryService } from './country.service';
import { CreateCountryDto } from './dto/create-country.dto';
import { UpdateCountryDto } from './dto/update-country.dto';
import { I18nLang } from 'nestjs-i18n';
import { ApiTags, ApiOperation, ApiQuery, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { PermissionsGuard } from '../../guards/permissions.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Countries')
@ApiBearerAuth('bearerAuth')
@UseGuards(JwtAuthGuard)
@Controller('countries')
export class CountryController {
  constructor(private readonly countryService: CountryService) { }

  @Post('/add-country')
  async create(
    @Body() createCountryDto: CreateCountryDto,
    @I18nLang() lang: string = 'tk',
  ) {
    return this.countryService.create(createCountryDto, lang);
  }

  @Get('/get-all-country')
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'search', required: false, type: String })
  async findAll(
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Query('search') search?: string,
    @I18nLang() lang: string = 'tk',
  ) {
    return this.countryService.findAll(page, limit, lang, search);
  }


  @Patch('/update-country')
  @ApiOperation({ summary: 'Update a country' })
  async update(
    @Body() updateCountryDto: UpdateCountryDto,
    @I18nLang() lang: string = 'tk',
  ) {
    return this.countryService.update(updateCountryDto, lang);
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
  async remove(
    @Body('guid') guid: string,
    @I18nLang() lang: string = 'tk',
  ) {
    return this.countryService.remove(guid, lang);
  }
}