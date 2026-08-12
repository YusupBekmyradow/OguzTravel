import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { CountryService } from './country.service';
import { CreateCountryDto } from './dto/create-country.dto';
import { I18nLang } from 'nestjs-i18n';
import { ApiTags, ApiOperation, ApiQuery, ApiBody } from '@nestjs/swagger';

@ApiTags('Countries')
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
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @I18nLang() lang: string = 'tk',
  ) {
    return this.countryService.findAll(page, limit, lang);
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