import { CreateTurkishAirlineDto } from './create-turkish_airline.dto';
import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsUUID, IsNotEmpty } from 'class-validator';

export class UpdateTurkishAirlineDto extends PartialType(CreateTurkishAirlineDto) {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  declare guid: string;
}
