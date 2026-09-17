import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Salary } from './entities/salary.entity';
import { SalaryMonth } from './entities/salary-month.entity';
import { SalaryService } from './salary.service';
import { SalaryController } from './salary.controller';
import { User } from '../user/entities/user.entity';
import { Employee } from '../employee/entities/employee.entity';

@Module({
  imports: [SequelizeModule.forFeature([Salary, SalaryMonth, User, Employee])],
  controllers: [SalaryController],
  providers: [SalaryService],
  exports: [SalaryService],
})
export class SalaryModule { }
