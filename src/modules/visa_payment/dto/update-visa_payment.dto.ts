import { CreateVisaPaymentDto } from './create-visa_payment.dto';
import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class UpdateVisaPaymentDto extends PartialType(CreateVisaPaymentDto) {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  declare guid: string;
}
