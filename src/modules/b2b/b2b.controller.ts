import { Controller, Get, Post, Body, Patch, Delete, Query } from '@nestjs/common';
import { B2bService } from './b2b.service';
import { CreateB2bDto } from './dto/create-b2b.dto';
import { UpdateB2bDto } from './dto/update-b2b.dto';
import { ApiBody, ApiTags } from '@nestjs/swagger';


@ApiTags('B2B')
@Controller('b2b')
export class B2bController {
  constructor(private readonly b2bService: B2bService) { }

  @Post('/add-b2b')
  async create(@Body() createB2bDto: CreateB2bDto) {
    return this.b2bService.addB2b(createB2bDto);
  }

  @Get('/get-all-b2b')
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.b2bService.getAllB2b(Number(page), Number(limit));
  }

  @Patch('/update-b2b')
  async update(@Body() updateB2bDto: UpdateB2bDto) {
    return this.b2bService.updateB2b(updateB2bDto);
  }

  @Delete('/delete-b2b')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        guid: { type: 'string' }
      }
    }
  })
  async remove(@Body('guid') guid: string) {
    return this.b2bService.deleteB2b(guid);
  }
}
