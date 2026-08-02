import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { RailwayService } from './railway.service';
import { CreateRailwayDto } from './dto/create-railway.dto';
import { UpdateRailwayDto } from './dto/update-railway.dto';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Railway')
@ApiBearerAuth('bearerAuth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('/outbound')
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