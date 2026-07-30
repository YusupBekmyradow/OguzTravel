import { CreateInboundDto } from './create-inbound.dto';
import { IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';

export class UpdateInboundDto extends PartialType(CreateInboundDto) {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  declare guid: string;
}
