import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsNotEmpty, IsOptional, IsString, IsUUID } from "class-validator";

export class CreateMessageDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  declare assignee_guid: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  declare description?: string;
}
