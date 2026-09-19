import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsDateString, IsIn, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString, IsUUID } from "class-validator";

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

  @ApiProperty({ example: 1, enum: [1, 2, 3], description: 'Visa status (1, 2, 3)' })
  @IsNumber()
  @IsIn([1, 2, 3])
  @IsNotEmpty()
  declare status: number;

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
