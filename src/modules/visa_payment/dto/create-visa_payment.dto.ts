import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsUUID, IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

export class CreateVisaPaymentDto {
  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  declare visa_guid: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  declare inbound_guid: string;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  declare amount: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  declare currency?: string;

  @ApiProperty()
  @IsDateString()
  @IsNotEmpty()
  declare payment_date: Date;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  declare opr_guid: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  declare note?: string;

}
