import { Controller, Get, Post, Body, Patch, Delete, Query, UseGuards } from '@nestjs/common';
import { TtpPaymentService } from './ttp_payment.service';
import { CreateTtpPaymentDto } from './dto/create-ttp_payment.dto';
import { UpdateTtpPaymentDto } from './dto/update-ttp_payment.dto';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('TTP_Payment')
@ApiBearerAuth('bearerAuth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('/outbound')
@Controller('ttp-payment')
export class TtpPaymentController {
  constructor(private readonly ttpPaymentService: TtpPaymentService) { }

  @Post('/add-ttp-payment')
  create(@Body() createTtpPaymentDto: CreateTtpPaymentDto) {
    return this.ttpPaymentService.addTtpPayment(createTtpPaymentDto);
  }

  @Get('/get-all-ttp-payment')
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('tour_guid') tour_guid?: string,
    @Query('transfer_guid') transfer_guid?: string,
    @Query('package_guid') package_guid?: string,
  ) {
    return this.ttpPaymentService.getAllTtpPayments(Number(page), Number(limit), {
      tour_guid,
      transfer_guid,
      package_guid
    });
  }

  @Patch('/update-ttp-payment')
  async update(@Body() updateTtpPaymentDto: UpdateTtpPaymentDto) {
    return this.ttpPaymentService.updateTtpPayment(updateTtpPaymentDto);
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
  async remove(@Body('guid') guid: string) {
    return this.ttpPaymentService.deleteTtpPayment(guid);
  }
}