import { Controller, Get, Post, Body, Patch, Delete, Query, UseGuards } from '@nestjs/common';
import { TtpPaymentService } from './ttp_payment.service';
import { CreateTtpPaymentDto } from './dto/create-ttp_payment.dto';
import { UpdateTtpPaymentDto } from './dto/update-ttp_payment.dto';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { I18nLang } from 'nestjs-i18n';

@ApiTags('TTP_Payment')
@ApiBearerAuth('bearerAuth')
@UseGuards(JwtAuthGuard)
@Controller('ttp-payment')
export class TtpPaymentController {
  constructor(private readonly ttpPaymentService: TtpPaymentService) { }

  @Post('/add-ttp-payment')
  create(
    @Body() createTtpPaymentDto: CreateTtpPaymentDto,
    @I18nLang() lang: string = 'tk',
  ) {
    return this.ttpPaymentService.addTtpPayment(createTtpPaymentDto, lang);
  }

  @Get('/get-all-ttp-payment')
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('tour_guid') tour_guid?: string,
    @Query('transfer_guid') transfer_guid?: string,
    @Query('package_guid') package_guid?: string,
    @I18nLang() lang: string = 'tk',
  ) {
    return this.ttpPaymentService.getAllTtpPayments(Number(page), Number(limit), {
      tour_guid,
      transfer_guid,
      package_guid
    }, lang);
  }

  @Patch('/update-ttp-payment')
  async update(
    @Body() updateTtpPaymentDto: UpdateTtpPaymentDto,
    @I18nLang() lang: string = 'tk',
  ) {
    return this.ttpPaymentService.updateTtpPayment(updateTtpPaymentDto, lang);
  }

  @Delete('/delete-ttp-payment')
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
    return this.ttpPaymentService.deleteTtpPayment(guid, lang);
  }
}
