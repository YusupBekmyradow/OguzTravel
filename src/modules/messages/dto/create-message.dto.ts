import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsArray, IsBoolean, IsNotEmpty, IsOptional, IsString, IsUUID } from "class-validator";

export class CreateMessageDto {
  @ApiProperty({ type: [String], example: ['uuid-1', 'uuid-2'] })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsNotEmpty()
  declare assignee_guids: string[];

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  declare title?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  declare description?: string;
}
