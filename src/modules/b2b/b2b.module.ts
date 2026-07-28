import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { B2b } from './entities/b2b.entity';
import { B2bController } from './b2b.controller';
import { B2bService } from './b2b.service';
import { ClientModule } from '../client/client.module';
import { EmployeeModule } from '../employee/employee.module';
import { TstatusModule } from '../tstatus/tstatus.module';
import { TicketPaymentModule } from '../ticket_payment/ticket_payment.module';
import { TicketPayment } from '../ticket_payment/entities/ticket_payment.entity';
import { Client } from '../client/entities/client.entity';


@Module({
  imports: [
    SequelizeModule.forFeature([B2b, TicketPayment, Client]),
    EmployeeModule,
    ClientModule,
    TstatusModule,
    TicketPaymentModule
  ],
  controllers: [B2bController],
  providers: [B2bService],
  exports: [B2bService]
})
export class B2bModule { }