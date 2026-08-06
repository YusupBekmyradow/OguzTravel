import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { TurkishPaymentService } from './turkish_payment.service';
import { CreateTurkishPaymentDto } from './dto/create-turkish_payment.dto';
import { UpdateTurkishPaymentDto } from './dto/update-turkish_payment.dto';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { I18nLang } from 'nestjs-i18n';

@ApiTags('Turkish_Payment')
@ApiBearerAuth('bearerAuth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('/ticket/turkish-airlines')
@Controller('turkish-payment')
export class TurkishPaymentController {
  constructor(private readonly turkishPaymentService: TurkishPaymentService) { }

  @Post('/add-turkish-payment')
  create(@Body() createTurkishPaymentDto: CreateTurkishPaymentDto) {
    return this.turkishPaymentService.addturkishPayment(createTurkishPaymentDto);
  }

  @Get('/getAll-turkish-payment')
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('turkish_airline_guid') turkish_airline_guid: string
  ) {
    return this.turkishPaymentService.getAllturkishPayment(Number(page), Number(limit), turkish_airline_guid);
  }

  @Patch('/update-turkish-payment')
  async update(@Body() updateTurkishPaymentDto: UpdateTurkishPaymentDto) {
    return this.turkishPaymentService.updateturkishPayment(updateTurkishPaymentDto);
  }

  @Delete('/delete-turkish-payment')
  @ApiBody({
    schema: {
      type: 'object', properties: {
        guid: { type: 'string' }
      }
    }
  })
  async remove(@Body('guid') guid: string) {
    return this.turkishPaymentService.deleteturkishPayment(guid);
  }
}

