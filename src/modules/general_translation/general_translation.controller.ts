import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { GeneralTranslationService } from './general_translation.service';
import { CreateGeneralTranslationDto } from './dto/create-general_translation.dto';
import { UpdateGeneralTranslationDto } from './dto/update-general_translation.dto';

@Controller('general-translation')
export class GeneralTranslationController {
  constructor(private readonly generalTranslationService: GeneralTranslationService) {}

  @Post()
  create(@Body() createGeneralTranslationDto: CreateGeneralTranslationDto) {
    return this.generalTranslationService.create(createGeneralTranslationDto);
  }

  @Get()
  findAll() {
    return this.generalTranslationService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.generalTranslationService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateGeneralTranslationDto: UpdateGeneralTranslationDto) {
    return this.generalTranslationService.update(+id, updateGeneralTranslationDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.generalTranslationService.remove(+id);
  }
}
