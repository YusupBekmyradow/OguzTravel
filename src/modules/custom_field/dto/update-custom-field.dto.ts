import { ApiProperty, PartialType, OmitType } from '@nestjs/swagger';
import { CreateCustomFieldDto } from './create-custom-field.dto';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class UpdateCustomFieldDto extends PartialType(
  OmitType(CreateCustomFieldDto, [] as const),
) {
  @ApiProperty()
  @IsNotEmpty()
  @IsUUID()
  declare guid: string;
}