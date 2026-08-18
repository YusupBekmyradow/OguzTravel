import { IsString, IsEmail, IsNotEmpty, IsArray, ArrayNotEmpty, IsObject, IsUUID, IsOptional, MinLength, MaxLength } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';


export class CreateEmployeeDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  declare fullName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MinLength(12)
  @MaxLength(12)
  declare phone_number: string;

  @ApiPropertyOptional()
  @IsEmail()
  @IsOptional()
  declare gmail?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  declare address?: string

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  declare department_guid?: string;

  @ApiPropertyOptional({ type: [String], example: ['ed18f34d-beb2-404e-ab9b-8464a9b4fa3a'] })
  @Transform(({ value }) => {
    if (!value) return [];
    if (typeof value === 'string') {
      return value.split(',').map((item) => item.trim()).filter(Boolean);
    }
    if (Array.isArray(value)) {
      return value
        .flatMap((item) => (typeof item === 'string' ? item.split(',') : item))
        .map((item) => (typeof item === 'string' ? item.trim() : item))
        .filter(Boolean);
    }
    return value;
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  declare position_guids?: string[];

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  declare office_guid: string;
}