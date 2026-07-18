import { ApiProperty, ApiPropertyOptional, } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsIn, IsDate, IsNotEmpty, IsString, MinLength, MaxLength, IsOptional } from "class-validator";


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
    @Type(() => Date)
    @IsDate()
    @IsOptional()
    declare dateOfBirth?: Date;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    declare passport_number?: string

    @ApiPropertyOptional()
    @Type(() => Date)
    @IsDate()
    @IsOptional()
    declare passportExpiryDate?: Date;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    declare passportCountryOfIssue?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    declare gender?: string;

}