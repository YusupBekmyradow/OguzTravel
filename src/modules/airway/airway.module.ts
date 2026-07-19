import { Module } from '@nestjs/common';
import { AirwayService } from './airway.service';
import { AirwayController } from './airway.controller';
import { SequelizeModule } from '@nestjs/sequelize';
import { Airway } from './entities/airway.entity';
import { EmployeeModule } from '../employee/employee.module';
import { ClientModule } from '../client/client.module';

@Module({
  imports: [
    SequelizeModule.forFeature([Airway]),
    EmployeeModule,
    ClientModule
  ],
  controllers: [AirwayController],
  providers: [AirwayService],
  exports: [AirwayService]
})
export class AirwayModule { }
