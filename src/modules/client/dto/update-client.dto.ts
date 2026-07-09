import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateClientDto } from './create-client.dto';
import { IsUUID,IsNotEmpty } from 'class-validator';

export class UpdateClientDto extends PartialType(CreateClientDto) {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  declare guid: string;
}
