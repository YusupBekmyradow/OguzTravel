import { Module } from '@nestjs/common';
import { TransPaymentService } from './trans_payment.service';
import { TransPaymentController } from './trans_payment.controller';
import { TransPayment } from './entities/trans_payment.entity';
import { SequelizeModule } from '@nestjs/sequelize';
import { EmployeeModule } from '../employee/employee.module';

@Module({
  imports: [
    SequelizeModule.forFeature([TransPayment]),
    EmployeeModule
  ],
  controllers: [TransPaymentController],
  providers: [TransPaymentService],
  exports: [TransPaymentService]
})
export class TransPaymentModule { }
