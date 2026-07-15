import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsUUID, IsDateString, IsNotEmpty, IsNumber, IsString, IsOptional } from "class-validator";

export class CreateTurkishPaymentDto {
    @ApiProperty()
    @IsUUID()
    @IsNotEmpty()
    declare turkish_airline_guid: string;

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
