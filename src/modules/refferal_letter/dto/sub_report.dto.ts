import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsBoolean, IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID } from "class-validator";

export class CreateOtherLetterDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsBoolean()
  declare isOne: boolean;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  declare travel_document_number: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  declare travel_document_number1: string;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  declare total_letter: number;

  @ApiProperty()
  @IsDateString()
  @IsNotEmpty()
  declare date_time: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => (value === "" ? null : value))
  @IsString()
  declare status?: string;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  declare received_opr_guid: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  declare accepted_by?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  declare note?: string;
}