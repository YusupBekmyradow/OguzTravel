import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateOfficeDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    declare fullName:{
        tk: string,
        ru: string,
        en: string
    }
 
    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    declare shortName?:{
        tk: string,
        ru: string,
        en: string
    };
}
