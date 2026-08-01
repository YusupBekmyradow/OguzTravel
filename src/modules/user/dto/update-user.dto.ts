import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';
import { IsUUID, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  declare guid: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  declare role: string;
}
