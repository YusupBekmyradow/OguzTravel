import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class CreateCafeteriaDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsBoolean()
  declare type: boolean;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  declare amount: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsDateString()
  declare date: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  declare description?: string;
}
