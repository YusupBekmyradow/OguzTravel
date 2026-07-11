import { Module } from '@nestjs/common';
import { TicketPaymentService } from './ticket_payment.service';
import { TicketPaymentController } from './ticket_payment.controller';
import { SequelizeModule } from '@nestjs/sequelize';
import { TicketPayment } from './entities/ticket_payment.entity';

@Module({
  imports: [
    SequelizeModule.forFeature([TicketPayment])
  ],
  controllers: [TicketPaymentController],
  providers: [TicketPaymentService],
  exports: [SequelizeModule]
})
export class TicketPaymentModule { }
