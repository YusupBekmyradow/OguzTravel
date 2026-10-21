import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { RefferalCountryService } from './refferal_country.service';
import { CreateRefferalCountryDto } from './dto/create-refferal_country.dto';
import { UpdateRefferalCountryDto } from './dto/update-refferal_country.dto';
import { ApiBearerAuth, ApiBody, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { I18nLang } from 'nestjs-i18n';

@ApiTags('RefferalCountry')
@ApiBearerAuth('bearerAuth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('/professional-translation/referral-country')
@Controller('refferal-country')
export class RefferalCountryController {
  constructor(private readonly refferalCountryService: RefferalCountryService) { }

  @Post('/add-refferal-country')
  async create(
    @Body() createDto: CreateRefferalCountryDto,
    @I18nLang() lang: string = 'tk',
  ) {
    return this.refferalCountryService.addRefferalCountry(createDto, lang);
  }

  @Get('/get-all-refferal-country')
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'search', required: false, type: String })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @I18nLang() lang: string = 'tk',
  ) {
    return this.refferalCountryService.getAllRefferalCountry(
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined,
      search,
      lang,
    );
  }

  @Patch('/update-refferal-country')
  async update(
    @Body() updateDto: UpdateRefferalCountryDto,
    @I18nLang() lang: string = 'tk',
  ) {
    return this.refferalCountryService.updateRefferalCountry(updateDto, lang);
  }

  @Delete('/delete-refferal-country')
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
    return this.refferalCountryService.deleteRefferalCountry(guid, lang);
  }
}
