import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class CreateVisaCategoryDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  declare name: string;
}
