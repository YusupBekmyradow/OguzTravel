import { Module } from '@nestjs/common';
import { TtpPaymentService } from './ttp_payment.service';
import { TtpPaymentController } from './ttp_payment.controller';
import { SequelizeModule } from '@nestjs/sequelize';
import { TtpPayment } from './entities/ttp_payment.entity';
import { EmployeeModule } from '../employee/employee.module';
import { TourModule } from '../tour/tour.module';
import { TransferModule } from '../transfer/transfer.module';
import { PackageModule } from '../package/package.module';

@Module({
  imports: [
    SequelizeModule.forFeature([TtpPayment]),
    EmployeeModule,
    TourModule,
    TransferModule,
    PackageModule
  ],
  controllers: [TtpPaymentController],
  providers: [TtpPaymentService],
  exports: [TtpPaymentService]
})
export class TtpPaymentModule { }
