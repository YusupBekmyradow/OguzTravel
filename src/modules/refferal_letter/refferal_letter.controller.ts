import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { RefferalLetterService } from './refferal_letter.service';
import { CreateRefferalLetterDto } from './dto/create-refferal_letter.dto';
import { UpdateRefferalLetterDto } from './dto/update-refferal_letter.dto';
import { ApiBody, ApiTags } from '@nestjs/swagger';

@ApiTags('Refferal_Letter')
@Controller('refferal-letter')
export class RefferalLetterController {
  constructor(private readonly refferalLetterService: RefferalLetterService) { }

  @Post('/add-refferal-letter')
  async create(
    @Body() createDto: CreateRefferalLetterDto) {
    return this.refferalLetterService.addRefferalLetter(createDto);
  }

  @Get('/get-all-refferal-letter')
  async getAllRefferalLetter(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('received_opr_guid') received_opr_guid?: string,
    @Query('departure_date') departure_date?: string,
    @Query('return_date') return_date?: string,
    @Query('contract_date') contract_date?: string,
  ) {
    const filters = {
      received_opr_guid,
      departure_date,
      return_date,
      contract_date,
    };
    return await this.refferalLetterService.getAllRefferalLetter(Number(page), Number(limit), filters);
  }


  @Patch('/update-refferal-letter')
  async update(@Body() updateDto: UpdateRefferalLetterDto) {
    return this.refferalLetterService.updateRefferalLetter(updateDto);
  }

  @Delete('/delete-refferal-letter')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        guid: { type: 'string' }
      }
    }
  })
  async remove(@Body('guid') guid: string) {
    return this.refferalLetterService.deleteRefferalLetter(guid);
  }
}
