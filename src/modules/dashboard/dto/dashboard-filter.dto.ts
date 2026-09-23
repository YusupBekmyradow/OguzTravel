import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class DashboardFilterDto {
  @ApiPropertyOptional({ example: '2026-09-01'})
  @IsString()
  @IsOptional()
  declare start_date?: string;

  @ApiPropertyOptional({ example: '2026-09-23'})
  @IsString()
  @IsOptional()
  declare end_date?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  declare office_guid?: string;
}
