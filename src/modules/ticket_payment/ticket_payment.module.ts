import { Module } from '@nestjs/common';
import { TicketPaymentService } from './ticket_payment.service';
import { TicketPaymentController } from './ticket_payment.controller';
import { SequelizeModule } from '@nestjs/sequelize';
import { TicketPayment } from './entities/ticket_payment.entity';
import { B2bModule } from '../b2b/b2b.module';
import { B2b } from '../b2b/entities/b2b.entity';

@Module({
  imports: [
    SequelizeModule.forFeature([TicketPayment, B2b]),
  ],
  controllers: [TicketPaymentController],
  providers: [TicketPaymentService],
  exports: [TicketPaymentService]
})
export class TicketPaymentModule { }
