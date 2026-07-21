import { Module } from '@nestjs/common';
import { HarPaymentService } from './har_payment.service';
import { HarPaymentController } from './har_payment.controller';
import { SequelizeModule } from '@nestjs/sequelize';
import { HarPayment } from './entities/har_payment.entity';
import { EmployeeModule } from '../employee/employee.module';
import { HotelModule } from '../hotel/hotel.module';
import { AirwayModule } from '../airway/airway.module';
import { RailwayModule } from '../railway/railway.module';

@Module({
  imports: [
    SequelizeModule.forFeature([HarPayment]),
    EmployeeModule,
    HotelModule,
    AirwayModule,
    RailwayModule
  ],
  controllers: [HarPaymentController],
  providers: [HarPaymentService],
  exports: [HarPaymentService],
})
export class HarPaymentModule { }
