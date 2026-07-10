import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { TstatusService } from './tstatus.service';
import { CreateTstatusDto } from './dto/create-tstatus.dto';
import { UpdateTstatusDto } from './dto/update-tstatus.dto';
import { ApiBody, ApiTags } from '@nestjs/swagger';


@ApiTags('TicketStatus')
@Controller('tstatus')
export class TstatusController {
  constructor(private readonly tstatusService: TstatusService) { }

  @Post('/add-tstatus')
  async create(@Body() createTstatusDto: CreateTstatusDto) {
    return this.tstatusService.addTstatus(createTstatusDto);
  }

  @Get('/get-all-tstatus')
  async findAll() {
    return this.tstatusService.getAllTstatus();
  }

  @Patch('/update-tstatus')
  async update(
    @Body() updateTstatusDto: UpdateTstatusDto) {
    return this.tstatusService.updateTstatus(updateTstatusDto);
  }


  @Delete('/delete-tstatus')
  @ApiBody({
    schema: {
      type: 'object', properties: {
        guid: { type: 'string' }
      }
    }
  })
  async remove(@Body('guid') guid: string) {
    return this.tstatusService.deleteTstatus(guid);
  }
}
