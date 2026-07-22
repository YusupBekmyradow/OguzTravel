import { Module } from '@nestjs/common';
import { PackageService } from './package.service';
import { PackageController } from './package.controller';
import { SequelizeModule } from '@nestjs/sequelize';
import { Package } from './entities/package.entity';
import { EmployeeModule } from '../employee/employee.module';
import { ClientModule } from '../client/client.module';
import { TtpPayment } from '../ttp_payment/entities/ttp_payment.entity';

@Module({
  imports: [
    SequelizeModule.forFeature([Package, TtpPayment]),
    EmployeeModule,
    ClientModule
  ],
  controllers: [PackageController],
  providers: [PackageService],
  exports: [PackageService],
})
export class PackageModule { }
