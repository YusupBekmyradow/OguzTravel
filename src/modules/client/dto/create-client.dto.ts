import { ApiProperty, } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsIn,IsDate, IsNotEmpty, IsString } from "class-validator";


export class CreateClientDto {

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    declare fullName: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    declare phone_number: string;

    @ApiProperty()
    @Type(() => Date)
    @IsDate()
    @IsNotEmpty()
    declare dateOfBirth: Date;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    declare passport_number: string

    @ApiProperty()
    @Type(() => Date)
    @IsDate()
    @IsNotEmpty()
    declare passportExpiryDate: Date;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    declare passportCountryOfIssue: string;

    @ApiProperty({ enum: ['Male', 'Female'] })
    @IsIn(['Male', 'Female'])
    @IsNotEmpty()
    declare gender: string;

}