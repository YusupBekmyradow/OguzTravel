import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { B2b } from './entities/b2b.entity';
import { B2bController } from './b2b.controller';
import { B2bService } from './b2b.service';
import { ClientModule } from '../client/client.module';
import { EmployeeModule } from '../employee/employee.module';
import { TstatusModule } from '../tstatus/tstatus.module';
import { TicketPaymentModule } from '../ticket_payment/ticket_payment.module';


@Module({
  imports: [
    SequelizeModule.forFeature([B2b]),
    EmployeeModule,
    ClientModule,
    TstatusModule,
    TicketPaymentModule
  ],
  controllers: [B2bController],
  providers: [B2bService],
  exports: [SequelizeModule]
})
export class B2bModule { }