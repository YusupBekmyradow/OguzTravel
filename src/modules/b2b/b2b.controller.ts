import { Controller, Get, Post, Body, Patch, Delete, Query, UseGuards } from '@nestjs/common';
import { B2bService } from './b2b.service';
import { CreateB2bDto } from './dto/create-b2b.dto';
import { UpdateB2bDto } from './dto/update-b2b.dto';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';


@ApiTags('B2B')
@ApiBearerAuth('bearerAuth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('/ticket/b2b')
@Controller('b2b')
export class B2bController {
  constructor(private readonly b2bService: B2bService) { }

  @Post('/add-b2b')
  async create(@Body() createB2bDto: CreateB2bDto) {
    return this.b2bService.addB2b(createB2bDto);
  }


  @Get('/get-all-b2b')
  async getAllB2b(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('datetime') datetime?: string,
    @Query('assignment_opr_guid') assignment_opr_guid?: string,
    @Query('receiver_opr_guid') receiver_opr_guid?: string,
    @Query('status_guid') status_guid?: string,
    @Query('travel_type') travel_type?: number,
    @Query('flight_date') flight_date?: string,
    @Query('is_paid') is_paid?: boolean,
  ) {
    const filters = {
      datetime,
      assignment_opr_guid,
      receiver_opr_guid,
      status_guid,
      travel_type: travel_type !== undefined ? Number(travel_type) : undefined,
      flight_date,
      is_paid: is_paid !== undefined ? String(is_paid) === 'true' : undefined,
    };
    return await this.b2bService.getAllB2b(Number(page), Number(limit), filters);
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
