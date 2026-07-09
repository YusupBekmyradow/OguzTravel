import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateEmployeeDto } from './create-employee.dto';
import { IsUUID, IsNotEmpty } from 'class-validator';

export class UpdateEmployeeDto extends PartialType(CreateEmployeeDto) {

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  declare guid: string;
}
