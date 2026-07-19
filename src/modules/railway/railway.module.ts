import { Module } from '@nestjs/common';
import { RailwayService } from './railway.service';
import { RailwayController } from './railway.controller';
import { SequelizeModule } from '@nestjs/sequelize';
import { Railway } from './entities/railway.entity';
import { EmployeeModule } from '../employee/employee.module';
import { ClientModule } from '../client/client.module';

@Module({
  imports: [
    SequelizeModule.forFeature([Railway]),
    EmployeeModule,
    ClientModule
  ],
  controllers: [RailwayController],
  providers: [RailwayService],
  exports: [RailwayService]
})
export class RailwayModule { }
