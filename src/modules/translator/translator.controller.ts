import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { TranslatorService } from './translator.service';
import { CreateTranslatorDto } from './dto/create-translator.dto';
import { UpdateTranslatorDto } from './dto/update-translator.dto';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Translator')
@ApiBearerAuth('bearerAuth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('/translation')
@Controller('translator')
export class TranslatorController {
  constructor(private readonly translatorService: TranslatorService) { }

  @Post('/add-translator')
  async create(@Body() createDto: CreateTranslatorDto) {
    return this.translatorService.addTranslator(createDto);
  }

  @Get('/get-all-translators')
  async findAll() {
    return this.translatorService.getAllTranslators();
  }

  @Patch('/update-translator')
  async update(@Body() updateDto: UpdateTranslatorDto) {
    return this.translatorService.updateTranslator(updateDto);
  }

  @Delete('/delete-translator')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { guid: { type: 'string' } }
    }
  })
  async remove(@Body('guid') guid: string) {
    return this.translatorService.deleteTranslator(guid);
  }
}