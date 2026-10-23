import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsDateString, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, IsUUID } from "class-validator";

export class CreateHotelDto {

    @ApiProperty()
    @IsDateString()
    @IsNotEmpty()
    declare application_date: Date;

    @ApiPropertyOptional()
    @IsUUID()
    @IsOptional()
    declare opr_guid?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    declare client_name?: string;

    @ApiProperty()
    @IsUUID()
    @IsNotEmpty()
    declare prepared_opr_guid: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    declare destination_country?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    declare hotel_name?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    declare room_type?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    declare meal_plan?: string;

    @ApiPropertyOptional()
    @IsNumber()
    @IsOptional()
    @IsPositive()
    declare guests_count?: number;

    @ApiProperty()
    @IsNumber()
    @IsNotEmpty()
    declare net_fare: number;

    @ApiPropertyOptional({ default: 'USD' })
    @IsString()
    @IsOptional()
    declare currency?: string;

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

    @ApiPropertyOptional()
    @IsNumber()
    @IsOptional()
    declare is_paid: number;
}