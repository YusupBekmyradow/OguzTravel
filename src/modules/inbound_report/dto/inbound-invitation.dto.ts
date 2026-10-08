import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateInboundInvitationDto {
  @ApiProperty({ example: '2026-01-01', description: 'Any day of the report month' })
  @IsDateString()
  @IsNotEmpty()
  declare report_month: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  declare country: string;

  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @IsOptional()
  declare granted_count?: number;

  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @IsOptional()
  declare refused_count?: number;

  @ApiPropertyOptional()
  @IsInt()
  @Min(0)
  @IsOptional()
  declare pending_count?: number;

  @ApiPropertyOptional({ description: "Granted an invitation but did not come (part of granted_count)" })
  @IsInt()
  @Min(0)
  @IsOptional()
  declare not_arrived_count?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  declare note?: string;
}

export class UpdateInboundInvitationDto extends PartialType(CreateInboundInvitationDto) {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  declare guid: string;
}
