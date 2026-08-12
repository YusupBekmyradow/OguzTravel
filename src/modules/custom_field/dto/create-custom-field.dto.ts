import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

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

export class CreateCustomFieldDto {
  @ApiProperty({ example: 'uuid-country-guid' })
  @IsUUID()
  @IsNotEmpty()
  declare country_guid: string;

  @ApiProperty({ example: 'passport_number' })
  @IsString()
  @IsNotEmpty()
  declare field_key: string;

  @ApiProperty({ type: CustomFieldLabelDto })
  @IsObject()
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => CustomFieldLabelDto)
  declare field_label: CustomFieldLabelDto;

  @ApiProperty({ example: 'text', description: 'text | number | date | select' })
  @IsString()
  @IsNotEmpty()
  declare field_type: string;

  @ApiProperty({ example: ['Option 1', 'Option 2'], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  declare options?: string[];

  @ApiProperty({ example: 0, required: false })
  @IsOptional()
  @IsNumber()
  declare sort_order?: number;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  declare is_active?: boolean;
}
