import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { VisaCategoryService } from './visa_category.service';
import { CreateVisaCategoryDto } from './dto/create-visa_category.dto';
import { UpdateVisaCategoryDto } from './dto/update-visa_category.dto';
import { ApiBody, ApiTags } from '@nestjs/swagger';

@ApiTags('Visa Categories')
@Controller('visa-category')
export class VisaCategoryController {
  constructor(private readonly visaCategoryService: VisaCategoryService) { }

  @Post('/add-visa-category')
  async create(@Body() createDto: CreateVisaCategoryDto) {
    return this.visaCategoryService.addVisaCategory(createDto);
  }

  @Get('/get-all-visa-categories')
  async findAll() {
    return this.visaCategoryService.getAllVisaCategories();
  }

  @Patch('/update-visa-category')
  async update(@Body() updateDto: UpdateVisaCategoryDto) {
    return this.visaCategoryService.updateVisaCategory(updateDto);
  }

  @Delete('/delete-visa-category')
  @ApiBody({
    schema: { type: 'object', properties: { guid: { type: 'string' } } }
  })
  async remove(@Body('guid') guid: string) {
    return this.visaCategoryService.deleteVisaCategory(guid);
  }
}
