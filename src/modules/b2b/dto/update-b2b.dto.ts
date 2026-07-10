import { CreateB2bDto } from './create-b2b.dto';
import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsUUID, IsNotEmpty } from 'class-validator';

export class UpdateB2bDto extends PartialType(CreateB2bDto) {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  declare guid: string;
}
