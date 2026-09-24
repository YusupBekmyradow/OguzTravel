import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

export class DashboardFilterDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  declare start_date?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  declare end_date?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  declare office_guid?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  declare currency?: string;
}


export class GetSummaryFilterDto extends DashboardFilterDto {
  @ApiPropertyOptional({ example: 'week', enum: ['day', 'week', 'month'] })
  @IsIn(['day', 'week', 'month'])
  @IsOptional()
  declare group_by?: 'day' | 'week' | 'month';
}


