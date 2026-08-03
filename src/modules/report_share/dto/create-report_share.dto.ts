import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsUUID, IsNotEmpty, IsNumber, IsOptional, IsString, IsDateString } from "class-validator";

export class CreateReportShareDto {
  @ApiProperty()
  @IsDateString()
  @IsNotEmpty()
  declare datetime: Date;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  declare total_count: number;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  declare assignment_opr_guid: string;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  declare receiver_opr_guid: string;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  declare start_yh_number: number;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  declare end_yh_number: number;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  declare status: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  declare note?: string;
}
