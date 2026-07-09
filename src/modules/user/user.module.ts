import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { SequelizeModule } from '@nestjs/sequelize';
import { User } from './entities/user.entity';
import { EmployeeModule } from '../employee/employee.module';

@Module({
  imports: [SequelizeModule.forFeature([User]),
  EmployeeModule
  ],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule { }
