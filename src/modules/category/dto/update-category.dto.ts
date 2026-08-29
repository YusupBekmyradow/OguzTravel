import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateCategoryDto } from './create-category.dto';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {
  @ApiProperty({ example: 'b1234567-89ab-cdef-0123-456789abcdef' })
  @IsUUID()
  @IsNotEmpty()
  declare guid: string;
}
