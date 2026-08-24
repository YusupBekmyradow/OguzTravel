import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class CreateCafeteriaDto {
  @IsNotEmpty({ message: 'Type is required' })
  @IsBoolean({ message: 'Type must be boolean' })
  type: boolean;

  @IsNotEmpty({ message: 'Amount is required' })
  @IsNumber({}, { message: 'Amount must be a number' })
  @IsPositive({ message: 'Amount must be greater than 0' })
  amount: number;

  @IsNotEmpty({ message: 'Date is required' })
  @IsString({ message: 'Date must be a string' })
  date: string;

  @IsOptional()
  @IsString()
  description?: string;
}
