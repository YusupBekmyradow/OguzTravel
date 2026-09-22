import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, Matches } from 'class-validator';

// ÝH serials: digits only, leading zeros kept, width varies up to 20.
const YH_NUMBER = /^[0-9]{1,20}$/;

export class CreateReportDto {
  @ApiProperty({ example: 'YH Hasabaty' })
  @IsString()
  @IsNotEmpty()
  declare name: string;

  @ApiProperty({ example: '0000001' })
  @IsString()
  @Matches(YH_NUMBER)
  declare start_yh_number: string;

  @ApiProperty({ example: '0090000' })
  @IsString()
  @Matches(YH_NUMBER)
  declare end_yh_number: string;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  declare total_letter?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  declare note?: string;
}
