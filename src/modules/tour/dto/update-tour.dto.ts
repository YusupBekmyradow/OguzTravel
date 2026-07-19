import { PartialType, ApiProperty } from '@nestjs/swagger';
import { CreateTourDto } from './create-tour.dto';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class UpdateTourDto extends PartialType(CreateTourDto) {
    @ApiProperty()
    @IsUUID()
    @IsNotEmpty()
    declare guid: string;
}