import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID } from "class-validator";

export class CreateVisaPackageDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  declare name: string;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  declare category_guid: string;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  declare price: number;

  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  declare index_number: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  declare table_type: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  declare description?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  declare sale_price?: number;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  declare sale_start_date?: Date;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  declare sale_end_date?: Date;
}
