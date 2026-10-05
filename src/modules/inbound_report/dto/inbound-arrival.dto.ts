import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsDateString, IsIn, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export const INBOUND_GENDERS = ['MALE', 'FEMALE'];

export class CreateInboundArrivalDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  declare full_name: string;

  @ApiProperty({ enum: INBOUND_GENDERS })
  @IsIn(INBOUND_GENDERS)
  declare gender: string;

  @ApiPropertyOptional({ example: '1980-03-12' })
  @IsDateString()
  @IsOptional()
  declare birth_date?: string | null;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  declare passport_number: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  declare citizenship: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  declare invitation_number?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  declare voucher_number?: string;

  @ApiProperty({ example: '2026-10-10' })
  @IsDateString()
  @IsNotEmpty()
  declare entry_date: string;

  @ApiPropertyOptional({ example: '2026-10-15' })
  @IsDateString()
  @IsOptional()
  declare exit_date?: string | null;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  declare entry_border?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  declare exit_border?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  declare note?: string;
}

export class UpdateInboundArrivalDto extends PartialType(CreateInboundArrivalDto) {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  declare guid: string;
}
