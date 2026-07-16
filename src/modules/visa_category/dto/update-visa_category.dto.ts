import { CreateVisaCategoryDto } from './create-visa_category.dto';
import { IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';

export class UpdateVisaCategoryDto extends PartialType(CreateVisaCategoryDto) {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  declare guid: string;
}
