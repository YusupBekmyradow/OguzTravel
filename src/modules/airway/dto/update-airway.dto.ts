import { CreateAirwayDto } from './create-airway.dto';
import { IsNotEmpty, IsUUID } from 'class-validator';
import { PartialType, ApiProperty } from '@nestjs/swagger';

export class UpdateAirwayDto extends PartialType(CreateAirwayDto) {
    @ApiProperty()
    @IsUUID()
    @IsNotEmpty()
    declare guid: string;
}
