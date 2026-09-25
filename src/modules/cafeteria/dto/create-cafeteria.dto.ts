import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, IsUUID } from 'class-validator';

export class CreateCafeteriaDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsBoolean()
  declare type: boolean;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  declare amount: number;

  @ApiPropertyOptional({ default: 'TMT' })
  @IsOptional()
  @IsString()
  declare currency?: string;

  @ApiProperty({ description: 'ISO 8601 datetime, e.g. 2026-09-09T14:30:00.000Z' })
  @IsNotEmpty()
  @IsDateString()
  declare date: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  declare description?: string;

  /** Office of the transaction. Without it, the creator's office is used. */
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  declare office_guid?: string;
}
