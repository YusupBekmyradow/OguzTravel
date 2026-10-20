import { IsString, IsNotEmpty, IsUUID, IsOptional, IsNumber, IsDateString, IsBoolean, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateB2bDto {
  @ApiProperty()
  @IsDateString()
  @IsNotEmpty()
  declare datetime: Date;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  declare assignment_opr_guid: string;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  declare receiver_opr_guid: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  declare agent: {
    name: string,
    phone_number: string
  }

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  declare client_guid: string;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  declare status_guid: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  declare pnr: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  declare airline?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  declare route?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  declare class?: string;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  declare travel_type: number;

  @ApiProperty()
  @IsDateString()
  @IsNotEmpty()
  declare flight_date: Date;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  declare net_price: number;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  declare sale_price: number;

  @ApiPropertyOptional({ default: 'USD' })
  @IsString()
  @IsOptional()
  declare currency?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  declare card?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  declare note?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  declare is_paid: boolean;
}