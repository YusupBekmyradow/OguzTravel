import { IsString, IsArray, ValidateNested, IsOptional, IsInt, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { FieldType } from '../../../enums/custom-field-type.enum';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class LocalizedTextDto {
  @IsString() tk: string;
  @IsString() ru: string;
  @IsString() en: string;
}


export class CreateCountryDto {
  @ApiProperty()
  @IsString()
  declare code: string;

  @ApiProperty()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  declare name: LocalizedTextDto;

  @ApiProperty()
  @IsArray()
  @IsString({ each: true })
  custom_field_guids: string[];
}