import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsNotEmpty,
  IsBoolean,
  IsOptional,
  IsArray,
  IsUUID,
  ValidateIf,
  MinLength,
  MaxLength
} from "class-validator";

export class CreateUserDto {

  @ApiPropertyOptional({ description: 'Required if isExternalUser is false' })
  @ValidateIf(o => o.isExternalUser === false)
  @IsNotEmpty()
  @IsUUID()
  declare employee_guid?: string;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  declare isActive?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  declare isExternalUser?: boolean;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  declare password: string;

  @ApiPropertyOptional({ type: [String], default: [] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  declare permissions?: string[];

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MinLength(12)
  @MaxLength(12)
  declare phone_number?: string;
}