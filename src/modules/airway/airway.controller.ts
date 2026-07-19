import { Controller, Get, Post, Body, Patch, Delete, Query } from '@nestjs/common';
import { AirwayService } from './airway.service';
import { CreateAirwayDto } from './dto/create-airway.dto';
import { UpdateAirwayDto } from './dto/update-airway.dto';
import { ApiTags, ApiBody } from '@nestjs/swagger';

@ApiTags('Airway')
@Controller('airway')
export class AirwayController {
  constructor(private readonly airwayService: AirwayService) { }

  @Post('/add-airway')
  async create(@Body() createDto: CreateAirwayDto) {
    return this.airwayService.addAirway(createDto);
  }

  @Get('/get-airways')
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.airwayService.getAllAirway(Number(page), Number(limit));
  }

  @Patch('/update-airway')
  async update(@Body() updateDto: UpdateAirwayDto) {
    return this.airwayService.updateAirway(updateDto);
  }

  @Delete('/delete-airway')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        guid: { type: 'string' }
      }
    }
  })
  async remove(@Body('guid') guid: string) {
    return this.airwayService.deleteAirway(guid);
  }
}