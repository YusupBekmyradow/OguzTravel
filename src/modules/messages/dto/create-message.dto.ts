import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsArray, IsBoolean, IsNotEmpty, IsOptional, IsString, IsUUID, ValidateIf } from "class-validator";

export class CreateMessageDto {
  @ApiProperty({
    oneOf: [
      { type: 'boolean', example: true },
      { type: 'array', items: { type: 'string', format: 'uuid' }, example: ['uuid-1', 'uuid-2'] }
    ]
  })
  @ValidateIf((o) => typeof o.assignee_guids === 'boolean')
  @IsBoolean()
  @ValidateIf((o) => Array.isArray(o.assignee_guids))
  @IsArray()
  @IsUUID('4', { each: true })
  @IsNotEmpty()
  declare assignee_guids: boolean | string[];

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  declare title?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  declare description?: string;
}
