import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { VisaPaymentService } from './visa_payment.service';
import { CreateVisaPaymentDto } from './dto/create-visa_payment.dto';
import { UpdateVisaPaymentDto } from './dto/update-visa_payment.dto';
import { ApiBearerAuth, ApiBody, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Visa_Payment')
@ApiBearerAuth('bearerAuth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('/visa/applications', '/intake')
@Controller('visa-payment')
export class VisaPaymentController {
  constructor(private readonly visaPaymentService: VisaPaymentService) { }

  @Post('/add-visa-payment')
  create(@Body() createVisaPaymentDto: CreateVisaPaymentDto) {
    return this.visaPaymentService.addVisaPayment(createVisaPaymentDto);
  }

  @Get('/getAll-visa-payment')
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('visa_guid') visa_guid?: string,
    @Query('inbound_guid') inbound_guid?: string,
  ) {
    return this.visaPaymentService.getAllVisaPayment(
      Number(page),
      Number(limit),
      visa_guid,
      inbound_guid
    );
  }

  @Patch('/update-visa-payment')
  async update(@Body() updateVisaPaymentDto: UpdateVisaPaymentDto) {
    return this.visaPaymentService.updateVisaPayment(updateVisaPaymentDto);
  }

  @Delete('/delete-visa-payment')
  @ApiBody({
    schema: {
      type: 'object', properties: {
        guid: { type: 'string' }
      }
    }
  })
  async remove(@Body('guid') guid: string) {
    return this.visaPaymentService.deleteVisaPayment(guid);
  }
}