import { PartialType } from '@nestjs/mapped-types';
import { CreateGeneralTranslationDto } from './create-general_translation.dto';

export class UpdateGeneralTranslationDto extends PartialType(CreateGeneralTranslationDto) {}
