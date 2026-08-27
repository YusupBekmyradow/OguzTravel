import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { TotalCalculationsService } from './total_calculations.service';
import { CreateTotalCalculationDto } from './dto/create-total_calculation.dto';
import { UpdateTotalCalculationDto } from './dto/update-total_calculation.dto';

@Controller('total-calculations')
export class TotalCalculationsController {
  constructor(private readonly totalCalculationsService: TotalCalculationsService) {}

}
