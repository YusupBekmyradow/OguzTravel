import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Receiving } from './entities/receiving.entity';
import { ReceivingService } from './receiving.service';
import { ReceivingController } from './receiving.controller';
import { Country } from '../country/entities/country.entity';
import { CustomField } from '../custom_field/entities/custom_field.entity';
import { Office } from '../office/entities/office.entity';
import { Employee } from '../employee/entities/employee.entity';
import { Client } from '../client/entities/client.entity';

@Module({
  imports: [
    SequelizeModule.forFeature([Receiving, Country, Client, Employee, Office, CustomField]),
  ],
  controllers: [ReceivingController],
  providers: [ReceivingService],
  exports: [ReceivingService],
})
export class ReceivingModule { }
