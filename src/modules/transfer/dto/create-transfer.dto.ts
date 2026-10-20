import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID } from "class-validator";

export class CreateTransferDto {
  @ApiProperty()
  @IsDateString()
  @IsNotEmpty()
  declare application_date: Date;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  declare opr_guid: string;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  declare client_guid: string;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  declare prepared_opr_guid: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  declare destination_country?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  declare transfer_type?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  declare route?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  declare machine_type?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  declare guests_count?: number;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  declare net_fare: number;

  @ApiPropertyOptional({ default: 'USD' })
  @IsString()
  @IsOptional()
  declare currency?: string;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  declare price: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  declare system: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  declare note?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  declare is_paid: number;
}