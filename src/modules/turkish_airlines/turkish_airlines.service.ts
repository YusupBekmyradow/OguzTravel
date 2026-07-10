import { Injectable } from '@nestjs/common';
import { CreateTurkishAirlineDto } from './dto/create-turkish_airline.dto';
import { UpdateTurkishAirlineDto } from './dto/update-turkish_airline.dto';

@Injectable()
export class TurkishAirlinesService {
  create(createTurkishAirlineDto: CreateTurkishAirlineDto) {
    return 'This action adds a new turkishAirline';
  }

  findAll() {
    return `This action returns all turkishAirlines`;
  }

  findOne(id: number) {
    return `This action returns a #${id} turkishAirline`;
  }

  update(id: number, updateTurkishAirlineDto: UpdateTurkishAirlineDto) {
    return `This action updates a #${id} turkishAirline`;
  }

  remove(id: number) {
    return `This action removes a #${id} turkishAirline`;
  }
}
