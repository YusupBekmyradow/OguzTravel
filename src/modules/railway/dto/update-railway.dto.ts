import { PartialType, ApiProperty } from '@nestjs/swagger';
import { CreateRailwayDto } from './create-railway.dto';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class UpdateRailwayDto extends PartialType(CreateRailwayDto) {
    @ApiProperty()
    @IsUUID()
    @IsNotEmpty()
    declare guid: string;
}