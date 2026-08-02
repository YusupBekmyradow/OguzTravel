import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { OfficeService } from './office.service';
import { CreateOfficeDto } from './dto/create-office.dto';
import { UpdateOfficeDto } from './dto/update-office.dto';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Offices')
@ApiBearerAuth('bearerAuth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('/employee')
@Controller('office')
export class OfficeController {
  constructor(private readonly officeService: OfficeService) { }

  @Post('/add-office')
  async create(@Body() createOfficeDto: CreateOfficeDto) {
    return this.officeService.addOffice(createOfficeDto);
  }


  @Get('/get-all-offices')
  async findAll() {
    return this.officeService.getAllOffice();
  }


  @Patch('/update-office')
  async update(
    @Body() updateOfficeDto: UpdateOfficeDto) {
    return this.officeService.updateOffice(updateOfficeDto);
  }

  @Delete('/delete-office')
  @ApiBody({
    schema: {
      type: 'object', properties: {
        guid: { type: 'string' }
      }
    }
  })
  async remove(@Body('guid') guid: string) {
    return this.officeService.deleteOffice(guid);
  }
}
