import { Module } from '@nestjs/common';
import { TransferService } from './transfer.service';
import { TransferController } from './transfer.controller';
import { SequelizeModule } from '@nestjs/sequelize';
import { Transfer } from './entities/transfer.entity';
import { EmployeeModule } from '../employee/employee.module';
import { ClientModule } from '../client/client.module';

@Module({
  imports: [
    SequelizeModule.forFeature([Transfer]),
    EmployeeModule,
    ClientModule
  ],
  controllers: [TransferController],
  providers: [TransferService],
  exports: [TransferService]
})
export class TransferModule { }
