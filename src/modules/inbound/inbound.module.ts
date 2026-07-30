import { Module } from '@nestjs/common';
import { InboundService } from './inbound.service';
import { InboundController } from './inbound.controller';
import { SequelizeModule } from '@nestjs/sequelize';
import { Inbound } from './entities/inbound.entity';
import { OfficeModule } from '../office/office.module';
import { EmployeeModule } from '../employee/employee.module';
import { ClientModule } from '../client/client.module';

@Module({
  imports: [
    SequelizeModule.forFeature([Inbound]),
    EmployeeModule,
    ClientModule
  ],
  controllers: [InboundController],
  providers: [InboundService],
  exports: [InboundService]
})
export class InboundModule { }
