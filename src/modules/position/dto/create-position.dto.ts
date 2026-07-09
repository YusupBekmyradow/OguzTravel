import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional } from "class-validator";

export class CreatePositionDto {
  @ApiProperty()
  @IsNotEmpty()
  declare name: {
    tk: string,
    ru: string,
    en: string
  }
}
