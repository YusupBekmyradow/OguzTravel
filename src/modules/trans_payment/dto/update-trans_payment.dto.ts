import { CreateTransPaymentDto } from './create-trans_payment.dto';
import { PartialType, ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class UpdateTransPaymentDto extends PartialType(CreateTransPaymentDto) {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  declare guid: string;
}
