import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { TransStatusService } from './trans_status.service';
import { CreateTransStatusDto } from './dto/create-trans_status.dto';
import { UpdateTransStatusDto } from './dto/update-trans_status.dto';
import { ApiBody, ApiTags } from '@nestjs/swagger';

@ApiTags('TransStatus')
@Controller('trans-status')
export class TransStatusController {
  constructor(private readonly transStatusService: TransStatusService) { }

  @Post('/add-trans-status')
  async create(@Body() createDto: CreateTransStatusDto) {
    return this.transStatusService.addTransStatus(createDto);
  }

  @Get('/get-all-trans-status')
  async findAll() {
    return this.transStatusService.getAllTransStatus();
  }

  @Patch('/update-trans-status')
  async update(@Body() updateDto: UpdateTransStatusDto) {
    return this.transStatusService.updateTransStatus(updateDto);
  }

  @Delete('/delete-trans-status')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        guid: { type: 'string' }
      }
    }
  })
  async remove(@Body('guid') guid: string) {
    return this.transStatusService.deleteTransStatus(guid);
  }
}
