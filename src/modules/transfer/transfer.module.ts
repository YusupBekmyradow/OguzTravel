import { Module } from '@nestjs/common';
import { TransferService } from './transfer.service';
import { TransferController } from './transfer.controller';
import { SequelizeModule } from '@nestjs/sequelize';
import { Transfer } from './entities/transfer.entity';
import { EmployeeModule } from '../employee/employee.module';
import { TtpPayment } from '../ttp_payment/entities/ttp_payment.entity';

@Module({
  imports: [
    SequelizeModule.forFeature([Transfer, TtpPayment]),
    EmployeeModule,
  ],
  controllers: [TransferController],
  providers: [TransferService],
  exports: [TransferService]
})
export class TransferModule { }
