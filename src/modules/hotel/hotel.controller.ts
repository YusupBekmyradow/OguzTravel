import { Controller, Get, Post, Body, Patch, Delete, Query } from '@nestjs/common';
import { HotelService } from './hotel.service';
import { CreateHotelDto } from './dto/create-hotel.dto';
import { UpdateHotelDto } from './dto/update-hotel.dto';
import { ApiTags, ApiBody } from '@nestjs/swagger';

@ApiTags('Hotel')
@Controller('hotel')
export class HotelController {
  constructor(private readonly hotelService: HotelService) { }

  @Post('/add-hotel')
  async create(@Body() createDto: CreateHotelDto) {
    return this.hotelService.addHotel(createDto);
  }

  @Get('/get-hotels')
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.hotelService.getAllHotel(Number(page), Number(limit));
  }

  @Patch('/update-hotel')
  async update(@Body() updateDto: UpdateHotelDto) {
    return this.hotelService.updateHotel(updateDto);
  }

  @Delete('/delete-hotel')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        guid: { type: 'string' }
      }
    }
  })
  async remove(@Body('guid') guid: string) {
    return this.hotelService.deleteHotel(guid);
  }
}