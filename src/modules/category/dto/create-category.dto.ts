import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsObject } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({
    example: {
      tk: 'B2B',
      ru: 'B2B',
      en: 'B2B',
    },
  })
  @IsObject()
  @IsNotEmpty()
  declare name: {
    tk: string;
    ru: string;
    en: string;
  };
}
