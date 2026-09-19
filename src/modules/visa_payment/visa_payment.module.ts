import { Module } from '@nestjs/common';
import { VisaPaymentService } from './visa_payment.service';
import { VisaPaymentController } from './visa_payment.controller';
import { SequelizeModule } from '@nestjs/sequelize';
import { VisaPayment } from './entities/visa_payment.entity';
import { Visa } from '../visa/entities/visa.entity';
import { EmployeeModule } from '../employee/employee.module';

@Module({
  imports: [
    SequelizeModule.forFeature([VisaPayment, Visa]),
    EmployeeModule
  ],
  controllers: [VisaPaymentController],
  providers: [VisaPaymentService],
  exports: [VisaPaymentService]
})
export class VisaPaymentModule { }
