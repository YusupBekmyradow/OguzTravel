import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsEnum, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { FieldType } from '../../../enums/custom-field-type.enum';

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
  @ApiProperty({ type: CustomFieldLabelDto })
  @IsObject()
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => CustomFieldLabelDto)
  declare field_label: CustomFieldLabelDto;

  @ApiProperty({ enum: FieldType, example: FieldType.TEXT })
  @IsEnum(FieldType)
  @IsNotEmpty()
  declare field_type: FieldType;

  @ApiProperty({ example: ['Option 1', 'Option 2'], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  declare options?: string[];

  @ApiProperty({ example: 0, required: false })
  @IsOptional()
  @IsNumber()
  declare sort_order?: number;
}
