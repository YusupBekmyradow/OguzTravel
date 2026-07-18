import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, IsUUID } from "class-validator";

export class CreateGeneralTranslationDto {

  @ApiProperty({ example: '2026-07-18' })
  @IsDateString()
  @IsNotEmpty()
  declare received_day: Date;

  @ApiProperty({ example: '14:30' })
  @IsString()
  @IsNotEmpty()
  declare received_time: string;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  declare opr_guid: string;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  @IsPositive()
  declare page_count: number;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  declare client_guid: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  declare source_to_target: string;

  @ApiProperty({ example: '14:30' })
  @IsString()
  @IsNotEmpty()
  declare completed_time: string;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  declare status_guid: string;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  @IsPositive()
  declare completed_page_count: number;

  @ApiProperty({ example: '2026-07-18' })
  @IsDateString()
  @IsNotEmpty()
  declare completed_day: Date;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  declare translator_guid: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  declare correction_status: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  declare price?: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  declare note?: string;
}
