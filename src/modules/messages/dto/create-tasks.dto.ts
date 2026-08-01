import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsArray, IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID } from "class-validator";


export class CreateTaskDto {
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

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  declare priority?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  declare status?: number;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  declare due_date?: Date;
}