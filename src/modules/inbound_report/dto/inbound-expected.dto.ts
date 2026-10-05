import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateInboundExpectedDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  declare country: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  declare tourists_count: number;

  @ApiProperty({ example: '2026-02-04' })
  @IsDateString()
  @IsNotEmpty()
  declare start_date: string;

  @ApiProperty({ example: '2026-02-08' })
  @IsDateString()
  @IsNotEmpty()
  declare end_date: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  declare route?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  declare transport?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  declare note?: string;
}

export class UpdateInboundExpectedDto extends PartialType(CreateInboundExpectedDto) {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  declare guid: string;
}
