import { Injectable } from '@nestjs/common';
import { CreateTotalCalculationDto } from './dto/create-total_calculation.dto';
import { UpdateTotalCalculationDto } from './dto/update-total_calculation.dto';

@Injectable()
export class TotalCalculationsService {
  create(createTotalCalculationDto: CreateTotalCalculationDto) {
    return 'This action adds a new totalCalculation';
  }

  findAll() {
    return `This action returns all totalCalculations`;
  }

  findOne(id: number) {
    return `This action returns a #${id} totalCalculation`;
  }

  update(id: number, updateTotalCalculationDto: UpdateTotalCalculationDto) {
    return `This action updates a #${id} totalCalculation`;
  }

  remove(id: number) {
    return `This action removes a #${id} totalCalculation`;
  }
}
