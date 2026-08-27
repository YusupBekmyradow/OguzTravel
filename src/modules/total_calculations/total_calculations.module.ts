import { Module } from '@nestjs/common';
import { TotalCalculationsService } from './total_calculations.service';
import { TotalCalculationsController } from './total_calculations.controller';
import { SequelizeModule } from '@nestjs/sequelize';
import { TotalCalculation } from './entities/total_calculation.entity';
import { Employee } from '../employee/entities/employee.entity';
import { Office } from '../office/entities/office.entity';

@Module({
  imports: [
    SequelizeModule.forFeature([TotalCalculation, Employee, Office])
  ],
  controllers: [TotalCalculationsController],
  providers: [TotalCalculationsService],
  exports: [TotalCalculationsService],
})
export class TotalCalculationsModule { }
