import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { GeneralTranslationService } from './general_translation.service';
import { CreateGeneralTranslationDto } from './dto/create-general_translation.dto';
import { UpdateGeneralTranslationDto } from './dto/update-general_translation.dto';
import { ApiBody, ApiTags } from '@nestjs/swagger';

@ApiTags('General Translation')
@Controller('general-translation')
export class GeneralTranslationController {
  constructor(private readonly translationService: GeneralTranslationService) { }

  @Post('/add-translation')
  async create(@Body() createDto: CreateGeneralTranslationDto) {
    return this.translationService.addGeneralTranslation(createDto);
  }

  @Get('/get-translations')
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.translationService.getAllGeneralTranslation(Number(page), Number(limit));
  }

  @Patch('/update-translation/:guid')
  async update(
    @Body() updateDto: UpdateGeneralTranslationDto
  ) {
    return this.translationService.updateGeneralTranslation(updateDto);
  }

  @Delete('/delete-translation')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        guid: { type: 'string' }
      }
    }
  })
  async remove(@Body('guid') guid: string) {
    return this.translationService.deleteGeneralTranslation(guid);
  }
}
