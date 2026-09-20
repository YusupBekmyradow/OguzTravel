import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID } from "class-validator";

export class CreateTotalCalculationDto {
  @ApiPropertyOptional({ example: 'e1000000-0000-0000-0000-000000000001' })
  @IsString()
  @IsOptional()
  declare category_guid?: string;

  @ApiPropertyOptional({ example: '2026-08-27T10:00:00.000Z' })
  @IsDateString()
  @IsOptional()
  declare datetime?: Date;

  @ApiPropertyOptional({ example: 'b1234567-89ab-cdef-0123-456789abcdef' })
  @IsUUID()
  @IsOptional()
  declare receiver_opr_guid?: string;

  @ApiProperty({ example: 100.5 })
  @IsNumber()
  @IsNotEmpty()
  declare net_price: number;

  @ApiPropertyOptional({ default: 'USD', example: 'USD' })
  @IsString()
  @IsOptional()
  declare currency?: string;
}
