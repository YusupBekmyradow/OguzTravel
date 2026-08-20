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
  declare receiver_opr_guid: string;

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
