import { Injectable } from '@nestjs/common';
import { CreateGeneralTranslationDto } from './dto/create-general_translation.dto';
import { UpdateGeneralTranslationDto } from './dto/update-general_translation.dto';

@Injectable()
export class GeneralTranslationService {
  create(createGeneralTranslationDto: CreateGeneralTranslationDto) {
    return 'This action adds a new generalTranslation';
  }

  findAll() {
    return `This action returns all generalTranslation`;
  }

  findOne(id: number) {
    return `This action returns a #${id} generalTranslation`;
  }

  update(id: number, updateGeneralTranslationDto: UpdateGeneralTranslationDto) {
    return `This action updates a #${id} generalTranslation`;
  }

  remove(id: number) {
    return `This action removes a #${id} generalTranslation`;
  }
}
