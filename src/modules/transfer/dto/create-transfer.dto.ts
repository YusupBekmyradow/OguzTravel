import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID } from "class-validator";

export class CreateTransferDto {
  @ApiProperty()
  @IsDateString()
  @IsNotEmpty()
  declare application_date: Date;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  declare opr_guid: string;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  declare client_guid: string;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  declare prepared_opr_guid: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  declare destination_country: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  declare transfer_type: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  declare route: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  declare machine_type: string;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  declare guests_count: number;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  declare cost: number;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  declare price: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  declare system: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  declare note?: string;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  declare is_paid: boolean;
}