import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateCustomFieldDto } from './create-custom-field.dto';
import { IsOptional, IsUUID } from 'class-validator';

export class UpdateCustomFieldDto extends PartialType(CreateCustomFieldDto) {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  declare guid?: string;
}
