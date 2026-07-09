import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { ClientService } from './client.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Clients')
@Controller('client')
export class ClientController {
  constructor(private readonly clientService: ClientService) { }

  @Post('/add-client')
  async create(@Body() createClientDto: CreateClientDto) {
    return this.clientService.addClient(createClientDto);
  }

  @Get('/get-all-client')
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search?: string,
    @Query('gender') gender?: string,
    @Query('passportExpiryDate') passportExpiryDate?: string,
  ) {
    const filters = {
      gender,
      passportExpiryDate
    };
    return this.clientService.getAllClient(Number(page), Number(limit), search,
      filters);
  }


  @Patch('/update-client')
  async update(
    @Body() updateClientDto: UpdateClientDto) {
    return this.clientService.updateClient(updateClientDto);
  }

  @Delete('/delete-client')
  async remove(@Body('guid') guid: string) {
    return this.clientService.deleteClient(guid);
  }
}
