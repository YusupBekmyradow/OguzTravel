import { CreateVisaDocDto } from './create-visa_doc.dto';
import { PartialType, ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class UpdateVisaDocDto extends PartialType(CreateVisaDocDto) {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  declare guid: string;
}
