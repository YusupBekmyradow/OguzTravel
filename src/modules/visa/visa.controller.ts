import { Controller, Get, Post, Body, Patch, Delete, Query } from '@nestjs/common';
import { VisaService } from './visa.service';
import { CreateVisaDto } from './dto/create-visa.dto';
import { UpdateVisaDto } from './dto/update-visa.dto';
import { ApiBody, ApiTags } from '@nestjs/swagger';

@ApiTags('Visa')
@Controller('visa')
export class VisaController {
  constructor(private readonly visaService: VisaService) { }

  @Post('/add-visa')
  async create(@Body() createVisaDto: CreateVisaDto) {
    return this.visaService.addVisa(createVisaDto);
  }

  @Get('/get-visa')
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.visaService.getAllVisa(Number(page), Number(limit));
  }

  @Patch('/update-visa')
  update(@Body() updateVisaDto: UpdateVisaDto) {
    return this.visaService.updateVisa(updateVisaDto);
  }

  @Delete('/delete-visa')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        guid: { type: 'string' }
      }
    }
  })
  remove(@Body('guid') guid: string) {
    return this.visaService.deleteVisa(guid);
  }
}
