import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID } from "class-validator";

export class CreateTourDto {
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
    declare tour_name: string;

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
}