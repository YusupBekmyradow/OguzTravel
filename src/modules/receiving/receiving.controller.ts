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
import { ApiTags, ApiOperation, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { ReceivingService } from './receiving.service';
import { CreateReceivingDto } from './dto/create-receiving.dto';
import { UpdateReceivingDto } from './dto/update-receiving.dto';
import { I18nLang } from 'nestjs-i18n';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Receivings')
@ApiBearerAuth('bearerAuth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('/intake')
@Controller('receivings')
export class ReceivingController {
  constructor(private readonly receivingService: ReceivingService) { }

  @Post('/add-receiving')
  create(
    @Body() dto: CreateReceivingDto,
    @I18nLang() lang: string
  ) {
    return this.receivingService.addReceiving(dto, lang);
  }


  @Get('/get-all-receiving')
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('country_guid') country_guid?: string,
    @Query('office_guid') office_guid?: string,
    @Query('operator_guid') operator_guid?: string,
    @Query('application_date') application_date?: string,
    @Query('visa_type') visa_type?: string,
    @I18nLang() lang: string = 'tk',
  ) {
    return this.receivingService.findAllReceiving(
      { page, limit, search, country_guid, office_guid, operator_guid, application_date, visa_type },
      lang,
    );
  }


  @Patch('/update-receiving')
  update(
    @Body() dto: UpdateReceivingDto,
    @I18nLang() lang: string
  ) {
    return this.receivingService.updateReceiving(dto, lang);
  }


  @Delete('/delete-receiving')
  @ApiOperation({})
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        guid: { type: 'string', example: 'receiving-uuid-here' },
      },
    },
  })
  async remove(
    @Body('guid') bodyGuid: string,
    @I18nLang() lang: string
  ) {
    return this.receivingService.deleteReceiving(bodyGuid, lang);
  }
}