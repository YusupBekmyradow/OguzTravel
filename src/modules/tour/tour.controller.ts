import { Controller, Get, Post, Body, Patch, Delete, Query } from '@nestjs/common';
import { TourService } from './tour.service';
import { CreateTourDto } from './dto/create-tour.dto';
import { UpdateTourDto } from './dto/update-tour.dto';
import { ApiTags, ApiBody } from '@nestjs/swagger';

@ApiTags('Tour')
@Controller('tour')
export class TourController {
  constructor(private readonly tourService: TourService) { }

  @Post('/add-tour')
  async create(@Body() createDto: CreateTourDto) {
    return this.tourService.addTour(createDto);
  }

  @Get('/get-tours')
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.tourService.getAllTour(Number(page), Number(limit));
  }

  @Patch('/update-tour')
  async update(@Body() updateDto: UpdateTourDto) {
    return this.tourService.updateTour(updateDto);
  }

  @Delete('/delete-tour')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        guid: { type: 'string' }
      }
    }
  })
  async remove(@Body('guid') guid: string) {
    return this.tourService.deleteTour(guid);
  }
}