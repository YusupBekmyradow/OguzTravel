import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { TotalCalculation } from '../total_calculations/entities/total_calculation.entity';

@Module({
  imports: [SequelizeModule.forFeature([TotalCalculation])],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule { }

