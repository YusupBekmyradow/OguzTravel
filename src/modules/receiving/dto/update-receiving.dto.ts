import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateReceivingDto } from './create-receiving.dto';
import { IsOptional, IsUUID } from 'class-validator';

export class UpdateReceivingDto extends PartialType(CreateReceivingDto) {
  @ApiProperty({ required: false, example: 'receiving-uuid-here' })
  @IsOptional()
  @IsUUID()
  declare guid?: string;
}