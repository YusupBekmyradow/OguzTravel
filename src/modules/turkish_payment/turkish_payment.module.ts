import { Module } from '@nestjs/common';
import { TurkishPaymentService } from './turkish_payment.service';
import { TurkishPaymentController } from './turkish_payment.controller';
import { SequelizeModule } from '@nestjs/sequelize';
import { TurkishPayment } from './entities/turkish_payment.entity';

@Module({
  imports: [
    SequelizeModule.forFeature([TurkishPayment])
  ],
  controllers: [TurkishPaymentController],
  providers: [TurkishPaymentService],
  exports: [TurkishPaymentService]
})
export class TurkishPaymentModule { }
