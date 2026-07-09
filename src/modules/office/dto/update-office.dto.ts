import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateOfficeDto } from './create-office.dto';
import { IsUUID, IsNotEmpty } from 'class-validator';

export class UpdateOfficeDto extends PartialType(CreateOfficeDto) {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  declare guid: string;
}
