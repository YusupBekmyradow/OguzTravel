import { CreateRefferalLetterDto } from './create-refferal_letter.dto';
import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class UpdateRefferalLetterDto extends PartialType(CreateRefferalLetterDto) {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  declare guid: string;
}