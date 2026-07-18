import { CreateGeneralTranslationDto } from './create-general_translation.dto';
import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class UpdateGeneralTranslationDto extends PartialType(CreateGeneralTranslationDto) {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  declare guid: string;
}
