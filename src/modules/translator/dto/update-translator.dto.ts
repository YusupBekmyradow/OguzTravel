import { IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateTranslatorDto } from './create-translator.dto';

export class UpdateTranslatorDto extends PartialType(CreateTranslatorDto) {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  declare guid: string;
}
