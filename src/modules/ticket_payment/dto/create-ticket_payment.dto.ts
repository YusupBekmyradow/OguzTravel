import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsUUID, IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

export class CreateTicketPaymentDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  declare b2b_guid: string;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  declare amount: number;

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
