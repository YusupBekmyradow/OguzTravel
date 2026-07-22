import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class FilterGeneralTranslationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() received_day?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() received_time?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() opr_guid?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() completed_time?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() completed_day?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() translator_guid?: string;
  @ApiPropertyOptional({ default: 1 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
  @ApiPropertyOptional({ default: 10 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number = 10;
}