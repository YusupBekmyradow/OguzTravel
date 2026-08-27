import { Module } from '@nestjs/common';
import { TotalCalculationsService } from './total_calculations.service';
import { TotalCalculationsController } from './total_calculations.controller';
import { SequelizeModule } from '@nestjs/sequelize';
import { TotalCalculation } from './entities/total_calculation.entity';

@Module({
  imports: [
    SequelizeModule.forFeature([TotalCalculation])
  ],
  controllers: [TotalCalculationsController],
  providers: [TotalCalculationsService],
  exports: [TotalCalculationsService],
})
export class TotalCalculationsModule { }
