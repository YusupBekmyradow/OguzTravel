import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class FilterVisaDto {
  /** Client name / phone / passport, visa number, agent or note. */
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  /** Visa date (datetime), local calendar days, inclusive. */
  @ApiPropertyOptional({ example: '2026-09-01' }) @IsOptional() @IsString() start_date?: string;
  @ApiPropertyOptional({ example: '2026-09-30' }) @IsOptional() @IsString() end_date?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() receiver_opr_guid?: string;
  /** 1 | 2 | 3, or PROCESS | DONE | FAIL. */
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  /** "true" | "false". */
  @ApiPropertyOptional() @IsOptional() @IsString() is_paid?: string;
  @ApiPropertyOptional({ default: 1 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
  @ApiPropertyOptional({ default: 10 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number = 10;
}
