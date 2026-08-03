import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateReportDto {
  @ApiProperty({ example: 'YH Hasabaty' })
  @IsString()
  @IsNotEmpty()
  declare name: string;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  declare start_yh_number: number;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  declare end_yh_number: number;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  declare total_letter?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  declare note?: string;
}
