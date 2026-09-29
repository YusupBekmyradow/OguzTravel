import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class GetCategoryAnalyticsFilterDto {
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
  @IsOptional()
  declare category_guid?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  declare currency?: 'USD' | 'TMT';

  @ApiPropertyOptional({
    example: 'this_month',
    enum: ['this_month', 'last_month', 'last_3_months', 'this_year']
  })
  @IsIn(['this_month', 'last_month', 'last_3_months', 'this_year'])
  @IsOptional()
  declare period_preset?: 'this_month' | 'last_month' | 'last_3_months' | 'this_year';
}