import { IsString, IsEmail, IsNotEmpty, IsObject, IsUUID, IsOptional, MinLength, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
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

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  declare position_guid: string;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  declare office_guid: string;
}