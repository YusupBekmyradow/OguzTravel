import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreatePositionDto } from './create-position.dto';
import { IsUUID ,IsNotEmpty } from 'class-validator';

export class UpdatePositionDto extends PartialType(CreatePositionDto) {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  declare guid: string;
}
