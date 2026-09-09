import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsDateString, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString, IsUUID } from "class-validator";

export class CreateRefferalLetterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => (value === "" ? null : value))
  @IsString()
  declare application_number?: string;

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
  @IsString()
  @IsNotEmpty()
  declare travel_document_number: string;

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
  declare agent?: {
    name: string,
    phone_number: string;
  }

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  declare contract_number?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => (value === "" ? null : value))
  @IsDateString()
  declare contract_date?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  declare note?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => (value === "" ? null : value))
  @IsDateString()
  declare date_time?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => (value === "" ? null : value))
  @IsString()
  declare status?: string;
}
