import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';
import { CreateRefferalCountryDto } from './create-refferal_country.dto';

export class UpdateRefferalCountryDto extends PartialType(CreateRefferalCountryDto) {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  declare guid: string;
}
