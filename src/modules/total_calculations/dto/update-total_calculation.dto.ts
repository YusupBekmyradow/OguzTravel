import { PartialType } from '@nestjs/mapped-types';
import { CreateTotalCalculationDto } from './create-total_calculation.dto';

export class UpdateTotalCalculationDto extends PartialType(CreateTotalCalculationDto) {}
