import { CreateTurkishPaymentDto } from './create-turkish_payment.dto';
import { PartialType, ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class UpdateTurkishPaymentDto extends PartialType(CreateTurkishPaymentDto) {
    @ApiProperty()
    @IsUUID()
    @IsNotEmpty()
    declare guid: string;
}
