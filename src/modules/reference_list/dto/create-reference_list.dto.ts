import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger"
import { IsDateString, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString, IsUUID } from "class-validator"

export class CreateReferenceListDto {
  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  declare application_number: number;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  declare office_guid: string;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  declare client_guid: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  declare destination_country: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  declare transit_country?: string;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  declare trvl_document_num: number;

  @ApiProperty()
  @IsDateString()
  @IsNotEmpty()
  declare departure_date: Date;

  @ApiProperty()
  @IsDateString()
  @IsNotEmpty()
  declare arrival_date: Date;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  declare price: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  declare currency?: string;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  declare operator_guid: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  declare agent: {
    name: string,
    phone_number: string;
  }

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  declare contract_number: number;

  @ApiProperty()
  @IsDateString()
  @IsNotEmpty()
  declare contract_date: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  declare note?: string;

}

