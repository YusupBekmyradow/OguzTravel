import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ReferenceListService } from './reference_list.service';
import { CreateReferenceListDto } from './dto/create-reference_list.dto';
import { UpdateReferenceListDto } from './dto/update-reference_list.dto';

@Controller('reference-list')
export class ReferenceListController {
  constructor(private readonly referenceListService: ReferenceListService) {}

  @Post()
  create(@Body() createReferenceListDto: CreateReferenceListDto) {
    return this.referenceListService.create(createReferenceListDto);
  }

  @Get()
  findAll() {
    return this.referenceListService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.referenceListService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateReferenceListDto: UpdateReferenceListDto) {
    return this.referenceListService.update(+id, updateReferenceListDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.referenceListService.remove(+id);
  }
}
