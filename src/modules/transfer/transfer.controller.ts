import { Controller, Get, Post, Body, Patch, Delete, Query } from '@nestjs/common';
import { TransferService } from './transfer.service';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { UpdateTransferDto } from './dto/update-transfer.dto';
import { ApiTags, ApiBody } from '@nestjs/swagger';

@ApiTags('Transfer')
@Controller('transfer')
export class TransferController {
  constructor(private readonly transferService: TransferService) { }

  @Post('/add-transfer')
  async create(@Body() createDto: CreateTransferDto) {
    return this.transferService.addTransfer(createDto);
  }

  @Get('/get-transfers')
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.transferService.getAllTransfer(Number(page), Number(limit));
  }

  @Patch('/update-transfer')
  async update(@Body() updateDto: UpdateTransferDto) {
    return this.transferService.updateTransfer(updateDto);
  }

  @Delete('/delete-transfer')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        guid: { type: 'string' }
      }
    }
  })
  async remove(@Body('guid') guid: string) {
    return this.transferService.deleteTransfer(guid);
  }
}