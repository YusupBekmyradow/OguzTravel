import { PartialType, ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsNotEmpty } from 'class-validator';
import { CreateHarPaymentDto } from './create-har_payment.dto';

export class UpdateHarPaymentDto extends PartialType(CreateHarPaymentDto) {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  declare guid: string;
}
