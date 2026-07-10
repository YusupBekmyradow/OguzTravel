import { PartialType } from '@nestjs/mapped-types';
import { CreateTurkishAirlineDto } from './create-turkish_airline.dto';

export class UpdateTurkishAirlineDto extends PartialType(CreateTurkishAirlineDto) {}
