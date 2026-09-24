import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsDateString, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, IsUUID } from "class-validator";

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

  @ApiPropertyOptional({ example: '14:30' })
  @IsOptional()
  @IsString()
  declare completed_time?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @IsPositive()
  declare completed_page_count?: number;

  @ApiPropertyOptional({ example: '2026-07-18' })
  @IsOptional()
  @IsDateString()
  declare completed_day?: Date;

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

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  declare expense_price?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  declare note?: string;

  @ApiProperty({ example: 'false' })
  @IsString()
  @IsNotEmpty()
  declare status: string;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  declare is_paid: boolean;
}
