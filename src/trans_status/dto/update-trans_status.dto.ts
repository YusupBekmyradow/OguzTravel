import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateTransStatusDto } from './create-trans_status.dto';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class UpdateTransStatusDto extends PartialType(CreateTransStatusDto) {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  declare guid: string;
}
