import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { OfficeService } from './office.service';
import { CreateOfficeDto } from './dto/create-office.dto';
import { UpdateOfficeDto } from './dto/update-office.dto';
import { ApiBody, ApiTags } from '@nestjs/swagger';

@ApiTags('Offices')
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
