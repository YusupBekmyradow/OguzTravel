import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class CreateTranslatorDto {

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  declare fullName: string
}
