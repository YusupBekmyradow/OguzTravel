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
 @ApiPropertyOptional({ 
    example: 'this_month', 
    enum: ['this_month', 'last_month', 'last_3_months', 'this_year'] 
  })
  @IsIn(['this_month', 'last_month', 'last_3_months', 'this_year'])
  @IsOptional()
  declare period_preset?: 'this_month' | 'last_month' | 'last_3_months' | 'this_year';
}


