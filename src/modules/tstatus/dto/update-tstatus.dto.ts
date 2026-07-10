import { CreateTstatusDto } from './create-tstatus.dto';
import { IsUUID, IsNotEmpty } from 'class-validator';
import { PartialType, ApiProperty } from '@nestjs/swagger';

export class UpdateTstatusDto extends PartialType(CreateTstatusDto) {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  declare guid: string;
}
