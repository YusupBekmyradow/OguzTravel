import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsIn, IsNumber, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";

export const CASH_TYPES = ['INCOME', 'EXPENSE'] as const;

export class CreateTotalCalculationDto {
  @ApiPropertyOptional({ example: 'e1000000-0000-0000-0000-000000000001' })
  @IsString()
  @IsOptional()
  declare category_guid?: string;

  @ApiPropertyOptional({ example: '2026-08-27T10:00:00.000Z' })
  @IsDateString()
  @IsOptional()
  declare datetime?: Date;

  @ApiPropertyOptional({ example: 'b1234567-89ab-cdef-0123-456789abcdef' })
  @IsUUID()
  @IsOptional()
  declare receiver_opr_guid?: string;

  @ApiPropertyOptional({ example: 'c1234567-89ab-cdef-0123-456789abcdef', description: "Office whose cash this is — wins over the operator's office" })
  @IsUUID()
  @IsOptional()
  declare office_guid?: string;

  @ApiPropertyOptional({ enum: CASH_TYPES, default: 'EXPENSE' })
  @IsIn(CASH_TYPES)
  @IsOptional()
  declare type?: 'INCOME' | 'EXPENSE';

  @ApiPropertyOptional({ example: 100.5, description: 'Amount of the income / expense' })
  @IsNumber()
  @IsOptional()
  declare amount?: number;

  @ApiPropertyOptional({ example: 50.0, description: 'Amount of the income / expense in USD' })
  @IsNumber()
  @IsOptional()
  declare amount_usd?: number;

  @ApiPropertyOptional({ example: 150, description: 'Income only: profit of the amount; the expense (net_price) becomes amount − profit' })
  @IsNumber()
  @IsOptional()
  declare profit?: number;

  @ApiPropertyOptional({ example: 25.0, description: 'Income only: profit in USD' })
  @IsNumber()
  @IsOptional()
  declare profit_usd?: number;

  @ApiPropertyOptional({ example: 100.5, description: 'Legacy expense amount — prefer amount + type' })
  @IsNumber()
  @IsOptional()
  declare net_price?: number;

  @ApiPropertyOptional({ default: 'TMT', example: 'TMT' })
  @IsString()
  @IsOptional()
  declare currency?: string;

  @ApiPropertyOptional({ example: 'Kassa kabul etdim' })
  @IsString()
  @IsOptional()
  declare description?: string;

  @ApiPropertyOptional({ example: 'Lebap ofis' })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  declare giver?: string;

  @ApiPropertyOptional({ example: 'Rowshen' })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  declare receiver?: string;

  @ApiPropertyOptional({ example: 'Oguztravel' })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  declare company?: string;
}
