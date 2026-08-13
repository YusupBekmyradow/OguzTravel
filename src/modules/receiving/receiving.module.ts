import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Receiving } from './entities/receiving.entity';
import { ReceivingService } from './receiving.service';
import { ReceivingController } from './receiving.controller';
import { Country } from '../country/entities/country.entity';
import { CustomField } from '../custom_field/entities/custom_field.entity';
import { Client } from '../client/entities/client.entity';
import { Employee } from '../employee/entities/employee.entity';
import { Office } from '../office/entities/office.entity';

@Module({
  imports: [
    SequelizeModule.forFeature([Receiving, Country, CustomField, Client]),
  ],
  controllers: [ReceivingController],
  providers: [ReceivingService],
  exports: [ReceivingService],
})
export class ReceivingModule { }
