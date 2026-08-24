import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsDateString, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString, IsUUID } from "class-validator";

export class CreateVisaDto {

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  declare client_guid: string;

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
  declare status_guid: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  declare price_tmt?: number

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  declare price_usd?: number

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  declare is_paid: boolean;

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
  declare note?: string;
}
