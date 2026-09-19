
import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';
import { CreateOtherLetterDto } from './sub_report.dto';

export class UpdateOtherLetterDto extends PartialType(CreateOtherLetterDto) {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  declare guid: string;
}