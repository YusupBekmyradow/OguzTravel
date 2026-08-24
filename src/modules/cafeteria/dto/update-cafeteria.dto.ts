import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class UpdateCafeteriaDto {
  @IsNotEmpty({ message: 'guid is required' })
  @IsString()
  guid: string;

  @IsOptional()
  @IsBoolean()
  type?: boolean;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  amount?: number;

  @IsOptional()
  @IsString()
  date?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
