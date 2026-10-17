import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { VisaPaymentService } from './visa_payment.service';
import { CreateVisaPaymentDto } from './dto/create-visa_payment.dto';
import { UpdateVisaPaymentDto } from './dto/update-visa_payment.dto';
import { ApiBearerAuth, ApiBody, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { I18nLang } from 'nestjs-i18n';

@ApiTags('Visa_Payment')
@ApiBearerAuth('bearerAuth')
@UseGuards(JwtAuthGuard)
@Controller('visa-payment')
export class VisaPaymentController {
  constructor(private readonly visaPaymentService: VisaPaymentService) { }

  @Post('/add-visa-payment')
  create(
    @Body() createVisaPaymentDto: CreateVisaPaymentDto,
    @I18nLang() lang: string,
  ) {
    return this.visaPaymentService.addVisaPayment(createVisaPaymentDto, lang);
  }

  @Get('/getAll-visa-payment')
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('visa_guid') visa_guid?: string,
    @I18nLang() lang: string = 'tk',
  ) {
    return this.visaPaymentService.getAllVisaPayment(
      Number(page),
      Number(limit),
      visa_guid,
      lang,
    );
  }

  @Patch('/update-visa-payment')
  async update(
    @Body() updateVisaPaymentDto: UpdateVisaPaymentDto,
    @I18nLang() lang: string,
  ) {
    return this.visaPaymentService.updateVisaPayment(updateVisaPaymentDto, lang);
  }

  @Delete('/delete-visa-payment')
  @ApiBody({
    schema: {
      type: 'object', properties: {
        guid: { type: 'string' }
      }
    }
  })
  async remove(
    @Body('guid') guid: string,
    @I18nLang() lang: string,
  ) {
    return this.visaPaymentService.deleteVisaPayment(guid, lang);
  }
}