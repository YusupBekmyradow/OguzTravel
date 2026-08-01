import { Module } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';
import { SequelizeModule } from '@nestjs/sequelize';
import { Message } from './entities/message.entity';
import { User } from '../user/entities/user.entity';
import { EmployeeModule } from '../employee/employee.module';
import { TaskAssignee } from './entities/task_assignees.entity';

@Module({
  imports: [
    SequelizeModule.forFeature([Message, User, TaskAssignee]),
    EmployeeModule
  ],
  controllers: [MessagesController],
  providers: [MessagesService],
  exports: [MessagesService],
})
export class MessagesModule { }
