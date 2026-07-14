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
  @IsString()
  @IsOptional()
  declare service?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  declare hotel_booking?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  declare translation?: string;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  declare total_price: number

  @ApiPropertyOptional({ default: 'USD' })
  @IsString()
  @IsOptional()
  declare currency?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  declare note?: string;
}
