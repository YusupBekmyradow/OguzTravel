import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsArray, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { CreateTaskDto } from './create-tasks.dto';

export class UpdateTaskDto extends PartialType(CreateTaskDto) {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  declare guid: string;

  // Existing image paths the client keeps. When sent (even empty), the task's images become
  // `keep_images` + newly uploaded files, and only the dropped files are deleted from disk.
  @ApiPropertyOptional({ type: [String] })
  @Transform(({ value }) => {
    if (value === undefined || value === null) return value;
    const list = Array.isArray(value) ? value : [value];
    return list
      .flatMap((item) => (typeof item === 'string' ? item.split(',') : []))
      .map((item) => item.trim())
      .filter(Boolean);
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  declare keep_images?: string[];
}
