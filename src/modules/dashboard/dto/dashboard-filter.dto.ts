import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

export class DashboardFilterDto {
  @ApiPropertyOptional({ example: '2026-09-01' })
  @IsString()
  @IsOptional()
  declare start_date?: string;

  @ApiPropertyOptional({ example: '2026-09-23' })
  @IsString()
  @IsOptional()
  declare end_date?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  declare office_guid?: string;

  @ApiPropertyOptional({ example: 'USD', description: 'USD or TMT' })
  @IsString()
  @IsOptional()
  declare currency?: string;
}

// Diňe getSummary üçin:
export class GetSummaryFilterDto extends DashboardFilterDto {
  @ApiPropertyOptional({ example: 'week', enum: ['day', 'week', 'month'], description: 'Chart grouping: day, week, or month' })
  @IsIn(['day', 'week', 'month'])
  @IsOptional()
  declare group_by?: 'day' | 'week' | 'month';
}


