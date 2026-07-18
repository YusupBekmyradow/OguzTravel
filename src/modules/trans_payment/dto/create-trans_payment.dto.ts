import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID } from "class-validator";

export class CreateTransPaymentDto {
  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  declare amount: number;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  declare translation_guid: string;

  @ApiProperty()
  @IsDateString()
  @IsNotEmpty()
  declare payment_date: Date;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  declare note?: string;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  declare opr_guid: string;
}
