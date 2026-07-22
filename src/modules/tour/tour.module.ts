import { Module } from '@nestjs/common';
import { TourService } from './tour.service';
import { TourController } from './tour.controller';
import { SequelizeModule } from '@nestjs/sequelize';
import { Tour } from './entities/tour.entity';
import { EmployeeModule } from '../employee/employee.module';
import { ClientModule } from '../client/client.module';
import { TtpPayment } from '../ttp_payment/entities/ttp_payment.entity';

@Module({
  imports: [
    SequelizeModule.forFeature([Tour, TtpPayment]),
    EmployeeModule,
    ClientModule
  ],
  controllers: [TourController],
  providers: [TourService],
  exports: [TourService]
})
export class TourModule { }
