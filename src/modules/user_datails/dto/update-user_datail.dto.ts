import { IsString, IsOptional, IsArray, IsObject, ValidateNested, ValidateIf } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';


const transformJson = ({ value }: { value: any }) => {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      if (value.includes(',')) {
        return value.split(',').map((item) => item.trim());
      }
      return [value.trim()];
    }
  }
  return value;
};

export class ContactDto {
  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((o, value) => value !== '' && value !== null)
  @IsString() declare email?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() declare phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() declare location?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() declare website?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() declare linkedin?: string;
}

export class WorkExperienceDto {
  @ApiPropertyOptional() @IsOptional() @IsString() declare id?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() declare role?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() declare company?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() declare location?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() declare period?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() @IsString({ each: true }) declare bullets?: string[];
}

export class EducationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() declare id?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() declare degree?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() declare school?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() declare period?: string;
}

export class LanguageDto {
  @ApiPropertyOptional() @IsOptional() @IsString() declare name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() declare level?: string;
}

export class ReferenceDto {
  @ApiPropertyOptional() @IsOptional() @IsString() declare name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() declare role?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() declare company?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() declare contact?: string;
}

export class UpdateUserProfileDto {
  @ApiPropertyOptional() @IsString() declare guid: string;
  @ApiPropertyOptional() @IsOptional() @IsString() declare full_name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() declare role?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() declare status?: string;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary'
  })
  @IsOptional()
  declare avatar_url?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(transformJson)
  @IsObject()
  @ValidateNested()
  @Type(() => ContactDto)
  declare contact?: ContactDto;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(transformJson)
  @IsArray()
  @IsString({ each: true })
  declare skills?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  declare personal_summary?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(transformJson)
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkExperienceDto)
  declare work_experience?: WorkExperienceDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(transformJson)
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EducationDto)
  declare education?: EducationDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(transformJson)
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LanguageDto)
  declare languages?: LanguageDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(transformJson)
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReferenceDto)
  declare references?: ReferenceDto[];
}