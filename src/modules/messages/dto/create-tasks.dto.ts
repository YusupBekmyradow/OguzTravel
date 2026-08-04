import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsBoolean, IsArray, IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID } from "class-validator";


export class CreateTaskDto {
  @ApiProperty({ type: [String], example: ['ed18f34d-beb2-404e-ab9b-8464a9b4fa3a'] })
  @Transform(({ value }) => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') return [value];
    return value;
  })
  @IsArray()
  @IsUUID('4', { each: true })
  assignee_guids: string[];

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
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @IsOptional()
  declare status?: number;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  declare due_date?: Date;

  @ApiPropertyOptional({
    type: 'array',
    items: { type: 'string', format: 'binary' },
    required: false,
  })
  @IsOptional()
  declare images?: any;
}