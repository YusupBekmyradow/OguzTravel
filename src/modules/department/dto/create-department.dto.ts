import { ApiProperty } from "@nestjs/swagger"
import { IsNotEmpty } from "class-validator"

export class CreateDepartmentDto {
   @ApiProperty()
    @IsNotEmpty()
    declare name: {
      tk: string,
      ru: string,
      en: string
    }
}
