import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';
import { CreateReportDto } from './create-report.dto';

export class UpdateReportDto extends PartialType(CreateReportDto) {
  @ApiProperty({ example: 'c6b3f7f8-9a21-4f11-8e01-123456789abc' })
  @IsUUID()
  @IsNotEmpty()
  declare guid: string;
}
