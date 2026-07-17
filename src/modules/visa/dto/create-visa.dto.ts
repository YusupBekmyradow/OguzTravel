import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString, IsUUID } from "class-validator";

export class CreateVisaDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  declare index_number: string;

  @ApiProperty()
  @IsDateString()
  @IsNotEmpty()
  declare datetime: Date;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  declare client_guid: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  declare agent: {
    name: string;
    phone_number: string;
  };

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  declare package_guid?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  declare service_guid?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  declare hotel_booking_guid?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  declare translation_guid?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  declare courier_guid?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  declare price_tmt?: number

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  declare price_usd?: number

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  declare note?: string;
}
