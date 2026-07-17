import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString, IsUUID } from "class-validator";

export class CreateRefferalLetterDto {
  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  declare application_number: number;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  declare received_opr_guid: string;

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
  declare tranzit?: string;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  declare travel_document_number: number;

  @ApiProperty()
  @IsDateString()
  @IsNotEmpty()
  declare departure_date: Date;

  @ApiProperty()
  @IsDateString()
  @IsNotEmpty()
  declare return_date: Date;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  declare price: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  declare currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  declare agent: {
    name: string,
    phone_number: string;
  }

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  declare contract_number?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  declare contract_date?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  declare note?: string;

}
