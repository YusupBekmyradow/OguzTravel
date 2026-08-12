import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CountryNameDto {
  @ApiProperty({ example: 'Türkmenistan' })
  @IsString()
  @IsNotEmpty()
  declare tk: string;

  @ApiProperty({ example: 'Туркменистан' })
  @IsString()
  @IsNotEmpty()
  declare ru: string;

  @ApiProperty({ example: 'Turkmenistan' })
  @IsString()
  @IsNotEmpty()
  declare en: string;
}

export class CustomFieldLabelDto {
  @ApiProperty({ example: 'Pasport Belgisi' })
  @IsString()
  @IsNotEmpty()
  declare tk: string;

  @ApiProperty({ example: 'Номер паспорта' })
  @IsString()
  @IsNotEmpty()
  declare ru: string;

  @ApiProperty({ example: 'Passport Number' })
  @IsString()
  @IsNotEmpty()
  declare en: string;
}

export class CreateCountryCustomFieldDto {
  @ApiProperty({ example: 'kratnost' })
  @IsString()
  @IsNotEmpty()
  declare field_key: string;

  @ApiProperty({ type: CustomFieldLabelDto })
  @IsObject()
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => CustomFieldLabelDto)
  declare field_label: CustomFieldLabelDto;

  @ApiProperty({ example: 'select', description: 'text | number | date | select' })
  @IsString()
  @IsNotEmpty()
  declare field_type: string;

  @ApiPropertyOptional({ example: ['SINGLE', 'DOUBLE', 'MULTI'], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  declare options?: string[];

  @ApiProperty({ example: 0, required: false })
  @IsOptional()
  @IsNumber()
  declare sort_order?: number;
}

export class CreateCountryDto {
  @ApiProperty({ example: 'TM' })
  @IsString()
  @IsNotEmpty()
  declare code: string;

  @ApiProperty({ type: CountryNameDto })
  @IsObject()
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => CountryNameDto)
  declare name: CountryNameDto;

  @ApiProperty({ type: [CreateCountryCustomFieldDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCountryCustomFieldDto)
  declare custom_fields?: CreateCountryCustomFieldDto[];
}
