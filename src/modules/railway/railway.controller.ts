import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { RailwayService } from './railway.service';
import { CreateRailwayDto } from './dto/create-railway.dto';
import { UpdateRailwayDto } from './dto/update-railway.dto';
import { ApiBody, ApiTags } from '@nestjs/swagger';

@ApiTags('Railway')
@Controller('railway')
export class RailwayController {
  constructor(private readonly railwayService: RailwayService) { }

  @Post('/add-railway')
  async create(
    @Body() createDto: CreateRailwayDto) {
    return this.railwayService.addRailway(createDto);
  }

  @Get('/get-railways')
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10) {
    return this.railwayService.getAllRailway(Number(page), Number(limit));
  }

  @Patch('/update-railway')
  async update(@Body() updateDto: UpdateRailwayDto) {
    return this.railwayService.updateRailway(updateDto);
  }

  @Delete('/delete-railway')
  @ApiBody({ schema: { type: 'object', properties: { guid: { type: 'string' } } } })
  async remove(@Body('guid') guid: string) {
    return this.railwayService.deleteRailway(guid);
  }
}