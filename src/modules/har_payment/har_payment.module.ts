import { Module } from '@nestjs/common';
import { HarPaymentService } from './har_payment.service';
import { HarPaymentController } from './har_payment.controller';
import { SequelizeModule } from '@nestjs/sequelize';
import { HarPayment } from './entities/har_payment.entity';

@Module({
  imports: [
    SequelizeModule.forFeature([HarPayment])
  ],
  controllers: [HarPaymentController],
  providers: [HarPaymentService],
  exports: [HarPaymentService],
})
export class HarPaymentModule { }
