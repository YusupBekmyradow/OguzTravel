import { Module } from '@nestjs/common';
import { PackageService } from './package.service';
import { PackageController } from './package.controller';
import { SequelizeModule } from '@nestjs/sequelize';
import { Package } from './entities/package.entity';
import { EmployeeModule } from '../employee/employee.module';
import { ClientModule } from '../client/client.module';

@Module({
  imports: [
    SequelizeModule.forFeature([Package]),
    EmployeeModule,
    ClientModule
  ],
  controllers: [PackageController],
  providers: [PackageService],
  exports: [PackageService],
})
export class PackageModule { }
