import { Module } from '@nestjs/common';
import { TtpPaymentService } from './ttp_payment.service';
import { TtpPaymentController } from './ttp_payment.controller';
import { SequelizeModule } from '@nestjs/sequelize';
import { TtpPayment } from './entities/ttp_payment.entity';

@Module({
  imports: [
    SequelizeModule.forFeature([TtpPayment])
  ],
  controllers: [TtpPaymentController],
  providers: [TtpPaymentService],
  exports: [TtpPaymentService]
})
export class TtpPaymentModule { }
