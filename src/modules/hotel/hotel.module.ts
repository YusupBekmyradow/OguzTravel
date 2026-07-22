import { Module } from '@nestjs/common';
import { HotelService } from './hotel.service';
import { HotelController } from './hotel.controller';
import { SequelizeModule } from '@nestjs/sequelize';
import { Hotel } from './entities/hotel.entity';
import { EmployeeModule } from '../employee/employee.module';
import { ClientModule } from '../client/client.module';
import { HarPayment } from '../har_payment/entities/har_payment.entity';

@Module({
  imports: [
    SequelizeModule.forFeature([Hotel, HarPayment]),
    EmployeeModule,
    ClientModule
  ],
  controllers: [HotelController],
  providers: [HotelService],
  exports: [HotelService]
})
export class HotelModule { }
