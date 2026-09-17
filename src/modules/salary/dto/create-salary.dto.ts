import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class CreateSalaryDto {
  @ApiProperty({ example: '2026-07', description: 'YYYY-MM' })
  @IsNotEmpty()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/)
  declare month: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsUUID()
  declare employee_guid: string;

  @ApiProperty({ description: 'OKLAD' })
  @IsNumber()
  @Min(0)
  declare base_salary: number;

  @ApiProperty({ description: 'IŞ GÜN' })
  @IsInt()
  @Min(1)
  @Max(31)
  declare work_days: number;

  @ApiProperty({ description: 'IŞLÄN' })
  @IsInt()
  @Min(0)
  @Max(31)
  declare worked_days: number;

  @ApiPropertyOptional({ description: "KART'a geçýäni" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  declare card_amount?: number;

  @ApiPropertyOptional({ description: 'AWANS' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  declare advance?: number;

  @ApiPropertyOptional({ description: 'Kofe KREDIT' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  declare cafeteria_credit?: number;

  @ApiPropertyOptional({ description: 'KARZ' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  declare loan?: number;

  @ApiPropertyOptional({ description: 'BONUS' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  declare bonus?: number;

  @ApiPropertyOptional({ description: 'Sales the percent bonus is based on; null for a fixed bonus' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  declare sales_amount?: number | null;

  @ApiPropertyOptional({ description: 'Bonus percent of sales_amount (0-100); null for a fixed bonus' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  declare bonus_percent?: number | null;

  @ApiPropertyOptional({ description: 'BERLEN' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  declare paid_amount?: number;

  @ApiPropertyOptional({ description: 'SENESI, YYYY-MM-DD' })
  @IsOptional()
  @IsDateString()
  declare paid_date?: string | null;

  @ApiPropertyOptional({ default: 'TMT' })
  @IsOptional()
  @IsString()
  declare currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  declare note?: string;
}
