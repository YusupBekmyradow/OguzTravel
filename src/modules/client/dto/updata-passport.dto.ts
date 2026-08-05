import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdatePassportDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  declare guid: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  declare passport_number?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  declare passportExpiryDate?: Date;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  declare passportCountryOfIssue?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  declare passportIssueDate?: Date;

  @ApiPropertyOptional({
    type: 'array',
    items: { type: 'string', format: 'binary' },
    required: false,
  })
  @IsOptional()
  declare images?: any;
}