import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MaxLength, MinLength } from "class-validator";

export class signInAuthDto {

  @ApiProperty({ description: ' phone number required', example: '+99365893141' })
  @IsNotEmpty()
  @IsString()
  @MinLength(12)
  @MaxLength(12)
  declare phone_number: string;

  @ApiProperty({ description: ' password required', example: 'hack_001' })
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  @MaxLength(20)
  declare password: string;

}
