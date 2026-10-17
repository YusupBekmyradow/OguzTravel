import { Controller, Get, Post, Body, Patch, Delete, Query, UseGuards } from '@nestjs/common';
import { HarPaymentService } from './har_payment.service';
import { CreateHarPaymentDto } from './dto/create-har_payment.dto';
import { UpdateHarPaymentDto } from './dto/update-har_payment.dto';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { I18nLang } from 'nestjs-i18n';

@ApiTags('Har_Payment')
@ApiBearerAuth('bearerAuth')
@UseGuards(JwtAuthGuard)
@Controller('har-payment')
export class HarPaymentController {
  constructor(private readonly harPaymentService: HarPaymentService) { }

  @Post('/add-har-payment')
  create(
    @Body() createHarPaymentDto: CreateHarPaymentDto,
    @I18nLang() lang: string = 'tk',
  ) {
    return this.harPaymentService.addHarPayment(createHarPaymentDto, lang);
  }

  @Get('/get-all-har-payment')
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('hotel_guid') hotel_guid?: string,
    @Query('airway_guid') airway_guid?: string,
    @Query('railway_guid') railway_guid?: string,
    @I18nLang() lang: string = 'tk',
  ) {
    return this.harPaymentService.getAllHarPayments(Number(page), Number(limit), {
      hotel_guid,
      airway_guid,
      railway_guid
    }, lang);
  }

  @Patch('/update-har-payment')
  async update(
    @Body() updateHarPaymentDto: UpdateHarPaymentDto,
    @I18nLang() lang: string = 'tk',
  ) {
    return this.harPaymentService.updateHarPayment(updateHarPaymentDto, lang);
  }

  @Delete('/delete-har-payment')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        guid: { type: 'string' }
      }
    }
  })
  async remove(
    @Body('guid') guid: string,
    @I18nLang() lang: string = 'tk',
  ) {
    return this.harPaymentService.deleteHarPayment(guid, lang);
  }
}
