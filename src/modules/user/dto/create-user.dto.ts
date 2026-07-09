import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { 
  IsString, 
  IsNotEmpty, 
  IsBoolean, 
  IsOptional, 
  IsArray, 
  IsUUID, 
  ValidateIf 
} from "class-validator";

export class CreateUserDto {

  @ApiPropertyOptional({ description: 'Required if isExternalUser is false' })
  @ValidateIf(o => o.isExternalUser === false)
  @IsNotEmpty()
  @IsUUID()
  employee_guid?: string;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isExternalUser?: boolean;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiPropertyOptional({ type: [String], default: [] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  permissions?: string[];

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  phone_number: string;
}