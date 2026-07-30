import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsUUID, IsNumber, IsBoolean, IsDateString, Min } from 'class-validator';

export class CreateInboundDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  declare invoice_number?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  declare invoice_date?: Date;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  declare receiver_opr_guid: string;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  declare client_guid: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  declare hotel: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  declare paid_tmt?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  declare paid_usd?: number;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  declare paid_date?: Date;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  declare due?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  declare note?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  declare is_paid?: boolean;
}