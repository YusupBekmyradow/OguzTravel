import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsUUID } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateReadStatusDto {
  @ApiPropertyOptional({
    type: [String],
    example: ['c6b3f7f8-9a21-4f11-8e01-123456789abc'],
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? [value] : value))
  @IsArray()
  @IsUUID('4', { each: true })
  declare task_guids?: string[];

  @ApiPropertyOptional({
    type: [String],
    example: ['ed18f34d-beb2-404e-ab9b-8464ab9f4a3a'],
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? [value] : value))
  @IsArray()
  @IsUUID('4', { each: true })
  declare assignee_guids?: string[];
}
