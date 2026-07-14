import { PartialType } from '@nestjs/mapped-types';
import { CreateReferenceListDto } from './create-reference_list.dto';

export class UpdateReferenceListDto extends PartialType(CreateReferenceListDto) {}
