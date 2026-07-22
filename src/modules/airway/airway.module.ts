import { Module } from '@nestjs/common';
import { AirwayService } from './airway.service';
import { AirwayController } from './airway.controller';
import { SequelizeModule } from '@nestjs/sequelize';
import { Airway } from './entities/airway.entity';
import { EmployeeModule } from '../employee/employee.module';
import { ClientModule } from '../client/client.module';
import { HarPayment } from '../har_payment/entities/har_payment.entity';

@Module({
  imports: [
    SequelizeModule.forFeature([Airway, HarPayment]),
    EmployeeModule,
    ClientModule
  ],
  controllers: [AirwayController],
  providers: [AirwayService],
  exports: [AirwayService]
})
export class AirwayModule { }
