import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional } from "class-validator";

export class CreateOfficeDto {
    @ApiProperty()
    @IsNotEmpty()
    declare fullName:{
        tk: string,
        ru: string,
        en: string
    }
 
    @ApiPropertyOptional()
    @IsOptional()
    declare shortName?:{
        tk: string,
        ru: string,
        en: string
    };
}
