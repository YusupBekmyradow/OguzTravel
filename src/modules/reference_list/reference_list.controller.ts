import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { ReferenceListService } from './reference_list.service';
import { CreateReferenceListDto } from './dto/create-reference_list.dto';
import { UpdateReferenceListDto } from './dto/update-reference_list.dto';
import { ApiBody, ApiTags } from '@nestjs/swagger';

@ApiTags('ReferenceList')
@Controller('reference-list')
export class ReferenceListController {
  constructor(private readonly referenceListService: ReferenceListService) { }

  @Post('/add-reference-list')
  async create(@Body() createReferenceListDto: CreateReferenceListDto) {
    return this.referenceListService.addReferenceList(createReferenceListDto);
  }

  @Get('/getAll-reference-list')
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.referenceListService.getAllReferenceList(Number(page), Number(limit));
  }

  @Patch('/update-reference-list')
  async update(@Body() updateReferenceListDto: UpdateReferenceListDto) {
    return this.referenceListService.updateReferenceList(updateReferenceListDto);
  }

  @Delete('/delete-reference-list')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        guid: { type: 'string' }
      }
    }
  })
  async remove(@Body('guid') guid: string) {
    return this.referenceListService.deleteReferenceList(guid);
  }
}
