import { CreateTicketPaymentDto } from './create-ticket_payment.dto';
import { PartialType, ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsNotEmpty } from 'class-validator';

export class UpdateTicketPaymentDto extends PartialType(CreateTicketPaymentDto) {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  declare guid: string;
}
