import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';
import { CreateCafeteriaDto } from './create-cafeteria.dto';

export class UpdateCafeteriaDto extends PartialType(CreateCafeteriaDto) {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  declare guid: string;
}
