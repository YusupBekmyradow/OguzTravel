import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  Matches,
} from 'class-validator';

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export class GenerateSalaryMonthDto {
  @ApiProperty({ example: '2026-07' })
  @IsNotEmpty()
  @Matches(MONTH_PATTERN)
  declare month: string;

  @ApiPropertyOptional({ description: 'Only employees of this office' })
  @IsOptional()
  @IsUUID()
  declare office_guid?: string;
}

export class MarkSalaryPaidDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('all', { each: true })
  declare guids: string[];

  @ApiPropertyOptional({ description: 'YYYY-MM-DD, defaults to today' })
  @IsOptional()
  @IsDateString()
  declare paid_date?: string;
}

export class LockSalaryMonthDto {
  @ApiProperty({ example: '2026-07' })
  @IsNotEmpty()
  @Matches(MONTH_PATTERN)
  declare month: string;

  @ApiProperty()
  @IsBoolean()
  declare is_locked: boolean;

  @ApiPropertyOptional({ description: 'Admins without an office only' })
  @IsOptional()
  @IsUUID()
  declare office_guid?: string;
}
