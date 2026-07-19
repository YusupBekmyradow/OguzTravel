import { CreateHotelDto } from './create-hotel.dto';
import { IsNotEmpty, IsUUID } from 'class-validator';
import { PartialType, ApiProperty } from '@nestjs/swagger';

export class UpdateHotelDto extends PartialType(CreateHotelDto) {
    @ApiProperty()
    @IsUUID()
    @IsNotEmpty()
    declare guid: string;
}
