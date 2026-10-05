import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString, IsUUID, Matches } from 'class-validator';

const GUID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

  // The shape of a guid, not @IsUUID(): the system categories have fixed ids
  // (e1000000-0000-0000-0000-00000000000x) that carry no UUID version, and
  // @IsUUID() rejects them. Anything else never reaches the uuid column.
  @ApiPropertyOptional()
  @Matches(GUID_SHAPE)
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