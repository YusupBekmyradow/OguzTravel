import { PartialType, ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsNotEmpty } from 'class-validator';
import { CreateTtpPaymentDto } from './create-ttp_payment.dto';

export class UpdateTtpPaymentDto extends PartialType(CreateTtpPaymentDto) {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  declare guid: string;
}
