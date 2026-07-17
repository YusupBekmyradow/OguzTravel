import { Module } from '@nestjs/common';
import { RefferalLetterService } from './refferal_letter.service';
import { RefferalLetterController } from './refferal_letter.controller';
import { RefferalLetter } from './entities/refferal_letter.entity';
import { EmployeeModule } from '../employee/employee.module';
import { ClientModule } from '../client/client.module';
import { SequelizeModule } from '@nestjs/sequelize';

@Module({
  imports: [
    SequelizeModule.forFeature([RefferalLetter]),
    EmployeeModule,
    ClientModule,
  ],

  controllers: [RefferalLetterController],
  providers: [RefferalLetterService],
})
export class RefferalLetterModule { }
