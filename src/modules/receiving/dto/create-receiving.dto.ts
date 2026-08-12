import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateReceivingDto {
  @ApiProperty({ example: '2026-08-12T00:00:00.000Z', required: false })
  @IsOptional()
  @IsDateString()
  declare application_date?: Date;

  @ApiProperty({ example: 'office-uuid', required: false })
  @IsOptional()
  @IsUUID()
  declare office_guid?: string;

  @ApiProperty({ example: 'country-uuid', required: false })
  @IsOptional()
  @IsUUID()
  declare country_guid?: string;

  @ApiProperty({ example: 'operator-uuid', required: false })
  @IsOptional()
  @IsUUID()
  declare operator_guid?: string;

  @ApiProperty({ example: 'client-uuid', required: false })
  @IsOptional()
  @IsUUID()
  declare client_guid?: string;

  @ApiProperty({ example: 'Tourist Visa', required: false })
  @IsOptional()
  @IsString()
  declare visa_type?: string;

  @ApiProperty({ example: { passport_number: 'A1234567' }, required: false })
  @IsOptional()
  @IsObject()
  declare extra_data?: Record<string, any>;

  @ApiProperty({ example: 'Note text', required: false })
  @IsOptional()
  @IsString()
  declare note?: string;
}
