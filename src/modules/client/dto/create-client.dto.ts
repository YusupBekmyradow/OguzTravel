import { ApiProperty, ApiPropertyOptional, } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import { IsIn, IsDate, IsNotEmpty, IsString, MinLength, MaxLength, IsOptional, IsDateString, IsBoolean } from "class-validator";


export class CreateClientDto {

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    declare fullName: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    declare phone_number?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsDateString()
    declare dateOfBirth?: Date;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    declare passport_number?: string

    @ApiPropertyOptional()
    @IsOptional()
    @IsDateString()
    declare passportExpiryDate?: Date;

    @ApiPropertyOptional()
    @IsDateString()
    @IsOptional()
    declare passportIssueDate?: Date;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    declare passportCountryOfIssue?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    declare gender?: string;

    @ApiPropertyOptional()
    @IsBoolean()
    @IsOptional()
    declare vip?: boolean;
}