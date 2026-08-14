import { Controller, Get, Post, Body, Patch, Delete, Query, UseGuards } from '@nestjs/common';
import { TransPaymentService } from './trans_payment.service';
import { CreateTransPaymentDto } from './dto/create-trans_payment.dto';
import { UpdateTransPaymentDto } from './dto/update-trans_payment.dto';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { I18nLang } from 'nestjs-i18n';

@ApiTags('Trans_Payment')
@ApiBearerAuth('bearerAuth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('/translation')
@Controller('trans-payment')
export class TransPaymentController {
  constructor(private readonly transPaymentService: TransPaymentService) { }

  @Post('/add-trans-payment')
  create(
    @Body() createTransPaymentDto: CreateTransPaymentDto,
    @I18nLang() lang: string = 'tk',
  ) {
    return this.transPaymentService.addTransPayment(createTransPaymentDto, lang);
  }

  @Get('/get-all-trans-payment')
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('translation_guid') translation_guid: string,
    @I18nLang() lang: string = 'tk',
  ) {
    return this.transPaymentService.getAllTransPayments(Number(page), Number(limit), translation_guid, lang);
  }

  @Patch('/update-trans-payment')
  async update(
    @Body() updateTransPaymentDto: UpdateTransPaymentDto,
    @I18nLang() lang: string = 'tk',
  ) {
    return this.transPaymentService.updateTransPayment(updateTransPaymentDto, lang);
  }

  @Delete('/delete-trans-payment')
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
    return this.transPaymentService.deleteTransPayment(guid, lang);
  }
}
