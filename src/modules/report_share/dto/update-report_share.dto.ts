import { CreateReportShareDto } from './create-report_share.dto';
import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class UpdateReportShareDto extends PartialType(CreateReportShareDto) {
  @ApiProperty({ example: 'c6b3f7f8-9a21-4f11-8e01-123456789abc' })
  @IsUUID()
  @IsNotEmpty()
  declare guid: string;
}
