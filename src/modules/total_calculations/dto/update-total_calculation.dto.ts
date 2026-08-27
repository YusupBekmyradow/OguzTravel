import { PartialType, ApiProperty } from '@nestjs/swagger';
import { CreateTotalCalculationDto } from './create-total_calculation.dto';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class UpdateTotalCalculationDto extends PartialType(CreateTotalCalculationDto) {
  @ApiProperty({ example: 'b1234567-89ab-cdef-0123-456789abcdef' })
  @IsUUID()
  @IsNotEmpty()
  declare guid: string;
}
