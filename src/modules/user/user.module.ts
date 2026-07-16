import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { SequelizeModule } from '@nestjs/sequelize';
import { User } from './entities/user.entity';
import { EmployeeModule } from '../employee/employee.module';
import { Employee } from '../employee/entities/employee.entity';

@Module({
  imports: [SequelizeModule.forFeature([User, Employee])
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService]
})
export class UserModule { }
