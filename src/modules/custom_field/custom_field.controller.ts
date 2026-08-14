import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CustomFieldService } from './custom_field.service';
import { CreateCustomFieldDto } from './dto/create-custom-field.dto';
import { UpdateCustomFieldDto } from './dto/update-custom-field.dto';
import { ApiTags, ApiQuery, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { I18nLang } from 'nestjs-i18n';
import { FieldType } from '../../enums/custom-field-type.enum';
import { PermissionsGuard } from '../../guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';


@ApiTags('Custom Fields')
@ApiBearerAuth('bearerAuth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('/intake')
@Controller('custom_fields')
export class CustomFieldController {
  constructor(private readonly customFieldService: CustomFieldService) { }

  @Post('/add-custom-field')
  async create(
    @Body() createCustomFieldDto: CreateCustomFieldDto,
    @I18nLang() lang: string = 'tk',
  ) {
    return this.customFieldService.addCustomField(createCustomFieldDto, lang);
  }

  @Get('/get-all-field')
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'field_type', required: false, enum: FieldType })
  @ApiQuery({ name: 'option_search', required: false, type: String })
  async findByCountry(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('field_type') field_type: FieldType,
    @Query('option_search') option_search: string,
    @I18nLang() lang: string = 'tk',
  ) {
    return this.customFieldService.getCustomFieldsByCountry(lang, {
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      field_type,
      option_search,
    });
  }

  @Patch('/update-custom-field')
  async update(
    @Body() updateCustomFieldDto: UpdateCustomFieldDto,
    @I18nLang() lang: string = 'tk',
  ) {
    return this.customFieldService.updateCustomField(updateCustomFieldDto, lang);
  }

  @Delete('/delete-custom-field')
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
    return this.customFieldService.deleteCustomField(guid, lang);
  }
}