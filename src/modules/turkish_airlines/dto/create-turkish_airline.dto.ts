import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsUUID, IsDateString, IsNotEmpty, IsOptional, IsObject, IsString, IsNumber, IsBoolean } from "class-validator";

export class CreateTurkishAirlineDto {
  @ApiProperty()
  @IsDateString()
  @IsNotEmpty()
  declare datetime: Date;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  declare assignment_opr_guid: string;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  declare receiver_opr_guid: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  declare agent: {
    name: string;
    phone_number: string;
  };

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  declare client_guid: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  declare milesSmiles?: string;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  declare status_guid: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  declare pnr: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  declare ticket_number: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  declare route: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  declare class: string;

  @ApiProperty()
  @IsDateString()
  @IsNotEmpty()
  declare flight_date: Date;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  declare total_price: number;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  declare base_fare: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  declare accepted_price?: number;


  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  declare returned_price?: number;

  @ApiPropertyOptional({ default: 'USD' })
  @IsString()
  @IsOptional()
  declare currency?: string;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  declare office_guid: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  declare note?: string;

  @ApiProperty()
  @IsBoolean()
  @IsNotEmpty()
  declare is_paid: boolean;
}
