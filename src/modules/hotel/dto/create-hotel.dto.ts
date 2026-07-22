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
    declare hotel_name: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    declare room_type: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    declare meal_plan: string;

    @ApiProperty()
    @IsNumber()
    @IsNotEmpty()
    @IsPositive()
    declare guests_count: number;

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

    @ApiPropertyOptional({ example: false })
    @IsBoolean()
    @IsOptional()
    declare is_paid: boolean;
}