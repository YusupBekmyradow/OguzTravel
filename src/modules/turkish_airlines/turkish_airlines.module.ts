import { Module } from '@nestjs/common';
import { TurkishAirlinesService } from './turkish_airlines.service';
import { TurkishAirlinesController } from './turkish_airlines.controller';
import { SequelizeModule } from '@nestjs/sequelize';
import { TurkishAirline } from './entities/turkish_airline.entity';
import { EmployeeModule } from '../employee/employee.module';
import { ClientModule } from '../client/client.module';
import { OfficeModule } from '../office/office.module';
import { TstatusModule } from '../tstatus/tstatus.module';

@Module({
  imports: [
    SequelizeModule.forFeature([TurkishAirline]),
    EmployeeModule,
    ClientModule,
    TstatusModule,
    OfficeModule
  ],
  controllers: [TurkishAirlinesController],
  providers: [TurkishAirlinesService],
  exports: [TurkishAirlinesService]
})
export class TurkishAirlinesModule { }
