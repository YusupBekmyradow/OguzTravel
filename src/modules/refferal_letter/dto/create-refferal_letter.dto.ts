import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID } from "class-validator";

export class CreateRefferalLetterDto {
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
  declare bgn_departure?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => (value === "" ? null : value))
  @IsString()
  declare bgn_arrival?: string;

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
  @IsString()
  declare status?: string;
}
