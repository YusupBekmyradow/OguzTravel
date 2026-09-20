import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  ValidateNested,
} from "class-validator";
import { CASH_TYPES } from "./create-total_calculation.dto";

export class ImportTotalCalculationRowDto {
  @ApiProperty({ enum: CASH_TYPES })
  @IsIn(CASH_TYPES)
  declare type: 'INCOME' | 'EXPENSE';

  @ApiProperty({ example: '2026-09-08T09:52:00.000Z' })
  @IsDateString()
  declare datetime: string;

  @ApiProperty({ example: 781 })
  @IsNumber()
  @IsPositive()
  declare amount: number;

  @ApiProperty({ example: 'USD' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  declare currency: string;

  @ApiProperty({ description: 'Deterministic hash of the source row (dedupe key)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  declare import_key: string;

  @ApiPropertyOptional({ example: 'Visa', description: 'Category name — matched case-insensitively, created if missing' })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  declare category_name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  declare description?: string;

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(255)
  @IsOptional()
  declare giver?: string;

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(255)
  @IsOptional()
  declare receiver?: string;

  @ApiPropertyOptional()
  @IsString()
  @MaxLength(255)
  @IsOptional()
  declare company?: string;
}

export class ImportTotalCalculationsDto {
  @ApiProperty({ type: [ImportTotalCalculationRowDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(1000)
  @ValidateNested({ each: true })
  @Type(() => ImportTotalCalculationRowDto)
  declare rows: ImportTotalCalculationRowDto[];
}
