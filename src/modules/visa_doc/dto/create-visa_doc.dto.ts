import {
  IsString,
  IsInt,
  IsOptional,
  IsArray,
  IsObject,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';


export class TableCellDto {
  @ApiPropertyOptional()
  @IsString()
  declare value: string;

  @ApiPropertyOptional()
  @IsInt()
  @Min(1)
  declare rowSpan: number;

  @ApiPropertyOptional()
  @IsInt()
  @Min(1)
  declare colSpan: number;
}


export class TableColumnDto {
  @ApiPropertyOptional()
  @IsString()
  declare id: string;

  @ApiPropertyOptional()
  @IsString()
  declare name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  declare width?: number;
}
export class TableRowDto {
  @ApiPropertyOptional()
  @IsString()
  declare id: string;

  @ApiPropertyOptional()
  @IsObject()
  declare cells: Record<string, TableCellDto>;
}



export class TableDataDto {
  @ApiPropertyOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TableColumnDto)
  declare columns: TableColumnDto[];

  @ApiPropertyOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TableRowDto)
  declare rows: TableRowDto[];
}



export class DocDetailsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  declare guid?: string;

  @ApiPropertyOptional()
  @IsString()
  declare title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  declare orderIndex?: number;

  @ApiPropertyOptional()
  @ValidateNested()
  @Type(() => TableDataDto)
  declare data: TableDataDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  declare note?: string;
}


export class CreateVisaDocDto {
  @ApiPropertyOptional()
  @IsString()
  declare title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  declare country?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DocDetailsDto)
  declare docDetails?: DocDetailsDto[];
}


