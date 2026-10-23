import { Module } from '@nestjs/common';
import { RailwayService } from './railway.service';
import { RailwayController } from './railway.controller';
import { SequelizeModule } from '@nestjs/sequelize';
import { Railway } from './entities/railway.entity';
import { EmployeeModule } from '../employee/employee.module';
import { HarPayment } from '../har_payment/entities/har_payment.entity';

@Module({
  imports: [
    SequelizeModule.forFeature([Railway, HarPayment]),
    EmployeeModule,
  ],
  controllers: [RailwayController],
  providers: [RailwayService],
  exports: [RailwayService]
})
export class RailwayModule { }
