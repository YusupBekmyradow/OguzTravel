import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsDateString, IsNotEmpty, IsOptional, IsString, IsUUID } from "class-validator";


export class CreateTaskDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  declare assignee_guid: string;

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
  @IsString()
  @IsOptional()
  declare status?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  declare due_date?: Date;
}