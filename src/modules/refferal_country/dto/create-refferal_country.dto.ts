import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class CreateRefferalCountryDto {
  @ApiProperty({
    example: {
      tk: 'Turkiýe',
      ru: 'Турция',
      en: 'Turkey',
    },
  })
  @IsNotEmpty()
  declare name: {
    tk: string;
    ru: string;
    en: string;
  } | string;
}
