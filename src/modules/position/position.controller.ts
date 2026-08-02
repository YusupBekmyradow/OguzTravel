import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { PositionService } from './position.service';
import { CreatePositionDto } from './dto/create-position.dto';
import { UpdatePositionDto } from './dto/update-position.dto';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';


@ApiTags('Positions')
@ApiBearerAuth('bearerAuth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('/employee')
@Controller('position')
export class PositionController {
  constructor(private readonly positionService: PositionService) { }

  @Post('/add-position')
  async create(@Body() createPositionDto: CreatePositionDto) {
    return this.positionService.addPosition(createPositionDto);
  }

  @Get('/get-all-postions')
  async findAll() {
    return this.positionService.getAllPosition();
  }

  @Patch('/update-postion')
  async update(
    @Body() updatePositionDto: UpdatePositionDto) {
    return this.positionService.updatePosition(updatePositionDto);
  }


  @Delete('/delete-postion')
  @ApiBody({
    schema: {
      type: 'object', properties: {
        guid: { type: 'string' }
      }
    }
  })
  async remove(@Body('guid') guid: string) {
    return this.positionService.deletePosition(guid);
  }
}
