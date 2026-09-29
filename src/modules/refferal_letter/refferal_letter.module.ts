import { Module } from '@nestjs/common';
import { RefferalLetterService } from './refferal_letter.service';
import { RefferalLetterController } from './refferal_letter.controller';
import { RefferalLetter } from './entities/refferal_letter.entity';
import { RefferalCountry } from '../refferal_country/entities/refferal_country.entity';
import { EmployeeModule } from '../employee/employee.module';
import { ClientModule } from '../client/client.module';
import { SequelizeModule } from '@nestjs/sequelize';
import { Client } from '../client/entities/client.entity';

@Module({
  imports: [
    SequelizeModule.forFeature([RefferalLetter, Client, RefferalCountry]),
    EmployeeModule,
    ClientModule,
  ],

  controllers: [RefferalLetterController],
  providers: [RefferalLetterService],
})
export class RefferalLetterModule { }
