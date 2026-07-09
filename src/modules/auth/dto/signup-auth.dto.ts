import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { UserType } from "../../../enums/enums";

export class SignUpAuthDto {

  @ApiProperty({ description: ' phone number required', example: '+99365893141' })
  @IsNotEmpty()
  @IsString()
  @MinLength(12)
  @MaxLength(12)
  phone_number: string;

  @ApiProperty({ description: ' password required', example: 'hack_001' })
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  @MaxLength(20)
  password: string;

  @ApiProperty({ description: ' role required ', example: 'Admin', enum: UserType })
  @IsNotEmpty()
  role: UserType;

}
