import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateCountryDto } from './create-country.dto';
import { IsUUID, IsNotEmpty } from 'class-validator';

export class UpdateCountryDto extends PartialType(CreateCountryDto) {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  declare guid: string;
}
