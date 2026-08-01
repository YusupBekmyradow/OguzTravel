import { HttpStatus, Injectable } from '@nestjs/common';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { InjectModel } from '@nestjs/sequelize';
import { Message } from './entities/message.entity';
import { User } from '../user/entities/user.entity';
import { errorResponse } from '../../helpers/responseFunctions';
import { Employee } from '../employee/entities/employee.entity';
import { CreateTaskDto } from './dto/create-tasks.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { Op } from 'sequelize';

@Injectable()
export class MessagesService {
  constructor(
    @InjectModel(Message) private readonly messageRepository: typeof Message,
    @InjectModel(User) private readonly userRepository: typeof User
  ) { }


  private getIncludes() {
    return [
      {
        model: User,
        as: 'admuser',
        attributes: ['guid', 'phone_number', 'role'],
        include: [{ model: Employee, attributes: ['guid', 'fullName'] }],
      },
      {
        model: User,
        as: 'empluser',
        attributes: ['guid', 'phone_number', 'role'],
        include: [{ model: Employee, attributes: ['guid', 'fullName'] }],
      },
    ];
  }

  private async findMessageByGuid(guid: string): Promise<Message | null> {
    return this.messageRepository.findOne({
      where: { guid },
      include: this.getIncludes(),
    });
  }

  async addMessage(senderGuid: string, createDto: CreateMessageDto) {
    try {
      const sender = await this.userRepository.findOne({
        where: { guid: senderGuid },
      });
      if (!sender) {
        return errorResponse(HttpStatus.NOT_FOUND, 'Sender user not found');
      }
      const isAdmin = sender.role === 'Admin';
      const messagePayload = {
        ...createDto,
        isMessage: true,
        adm_user_guid: isAdmin ? sender.guid : createDto.assignee_guid,
        empl_user_guid: isAdmin ? createDto.assignee_guid : sender.guid,
      };
      const createdMessage = await this.messageRepository.create(messagePayload as any);
      const newMessage = await this.findMessageByGuid(createdMessage.guid);
      if (!newMessage) {
        return errorResponse(HttpStatus.NOT_FOUND, 'Message not found after creation');
      }
      return {
        status: 201,
        data: newMessage.toJSON(),
        message: 'Message sent successfully',
      };
    }
    catch (error: any) {
      return errorResponse(HttpStatus.INTERNAL_SERVER_ERROR, 'Message creation failed', error)
    }
  }



  async updateMessage(updateDto: UpdateMessageDto) {
    try {
      const { guid, ...updateData } = updateDto;

      const message = await this.messageRepository.findOne({ where: { guid } });
      if (!message) {
        return errorResponse(HttpStatus.NOT_FOUND, 'Message not found');
      }

      await this.messageRepository.update(updateData, {
        where: { guid },
      });

      const updatedMessage = await this.findMessageByGuid(guid);
      if (!updatedMessage) {
        return errorResponse(HttpStatus.NOT_FOUND, 'Message not found after update');
      }

      return {
        status: 200,
        data: updatedMessage.toJSON(),
        message: 'Message updated successfully',
      };
    } catch (error: any) {
      return errorResponse(HttpStatus.INTERNAL_SERVER_ERROR, 'Message update failed', error);
    }
  }



  async getAllNotification(page: number = 1, limit: number = 10, assignee_guid?: string, isRead?: string) {
    try {
      const pageNum = Number(page) || 1;
      const limitNum = Number(limit) || 10;
      const offset = (pageNum - 1) * limitNum;
      const whereClause: any = {};
      if (assignee_guid) {
        whereClause.assignee_guid = assignee_guid;
      }
      if (isRead !== undefined) {
        whereClause.isRead = isRead === 'true';
      }
      const { rows, count } = await this.messageRepository.findAndCountAll({
        where: whereClause,
        include: this.getIncludes(),
        limit: limitNum,
        offset,
        order: [['createdAt', 'DESC']],
      });

      const formattedData = rows.map(item => {
        const json = item.toJSON();

        if (json.isMessage) {
          return {
            guid: json.guid,
            index_number: json.index_number,
            assignee_guid: json.assignee_guid,
            adm_user_guid: json.adm_user_guid,
            description: json.description,
            isRead: json.isRead,
            isMessage: json.isMessage,
            createdAt: json.createdAt,
            updatedAt: json.updatedAt,
            admuser: json.admuser,
            empluser: json.empluser,
          };
        } else {
          return {
            guid: json.guid,
            index_number: json.index_number,
            assignee_guid: json.assignee_guid,
            adm_user_guid: json.adm_user_guid,
            title: json.title,
            description: json.description,
            priority: json.priority,
            status: json.status,
            due_date: json.due_date,
            isRead: json.isRead,
            isMessage: json.isMessage,
            createdAt: json.createdAt,
            updatedAt: json.updatedAt,
            admuser: json.admuser,
            empluser: json.empluser,
          };
        }
      });
      return {
        status: 200,
        data: formattedData,
        meta: {
          totalItems: count,
          itemCount: rows.length,
          itemsPerPage: limitNum,
          totalPages: Math.ceil(count / limitNum),
          currentPage: pageNum,
        },
        message: 'Data fetched successfully',
      };
    } catch (error: any) {
      return errorResponse(HttpStatus.INTERNAL_SERVER_ERROR, 'Data fetch failed', error);
    }
  }




  async getAllTasks(
    page: number = 1,
    limit: number = 10,
    assignee_guid?: string,
    isRead?: string,
    priority?: string,
    status?: string,
    due_date?: string,
    search?: string,
  ) {
    try {
      const pageNum = Number(page) || 1;
      const limitNum = Number(limit) || 10;
      const offset = (pageNum - 1) * limitNum;

      const whereClause: any = {
        isMessage: false,
      };

      if (assignee_guid) {
        whereClause.assignee_guid = assignee_guid;
      }
      if (isRead !== undefined) {
        whereClause.isRead = isRead === 'true';
      }
      if (priority) {
        whereClause.priority = priority;
      }
      if (status) {
        whereClause.status = status;
      }
      if (due_date) {
        const startDate = `${due_date} 00:00:00`;
        const endDate = `${due_date} 23:59:59`;
        whereClause.due_date = {
          [Op.between]: [startDate, endDate],
        };
      }
      const includeOptions = this.getIncludes();
      if (search) {
        includeOptions.forEach((inc: any) => {
          if (inc.as === 'empluser' || inc.as === 'admuser' || inc.model === User) {
            inc.required = true;
            inc.include = [
              ...(inc.include || []),
              {
                model: Employee,
                as: 'employee',
                required: true,
                where: {
                  fullName: { [Op.iLike]: `%${search}%` },
                },
              },
            ];
          }
        });
      }
      const { rows, count } = await this.messageRepository.findAndCountAll({
        where: whereClause,
        include: includeOptions,
        limit: limitNum,
        offset,
        order: [['createdAt', 'DESC']],
      });

      const formattedData = rows.map(item => {
        const json = item.toJSON();
        return {
          guid: json.guid,
          index_number: json.index_number,
          assignee_guid: json.assignee_guid,
          adm_user_guid: json.adm_user_guid,
          title: json.title,
          description: json.description,
          priority: json.priority,
          status: json.status,
          due_date: json.due_date,
          isRead: json.isRead,
          isMessage: json.isMessage,
          createdAt: json.createdAt,
          updatedAt: json.updatedAt,
          admuser: json.admuser,
          empluser: json.empluser,
        };
      });

      return {
        status: 200,
        data: formattedData,
        meta: {
          totalItems: count,
          itemCount: rows.length,
          itemsPerPage: limitNum,
          totalPages: Math.ceil(count / limitNum),
          currentPage: pageNum,
        },
        message: 'Tasks fetched successfully',
      };
    } catch (error: any) {
      return errorResponse(HttpStatus.INTERNAL_SERVER_ERROR, 'Tasks fetch failed', error);
    }
  }



  async addTask(senderGuid: string, createDto: CreateTaskDto) {
    try {
      const sender = await this.userRepository.findOne({
        where: { guid: senderGuid },
      });
      if (!sender) {
        return errorResponse(HttpStatus.NOT_FOUND, 'Sender user not found');
      }

      const isAdmin = sender.role === 'Admin';
      const TaskPayload = {
        ...createDto,
        isMessage: false,
        adm_user_guid: isAdmin ? sender.guid : createDto.assignee_guid,
        empl_user_guid: isAdmin ? createDto.assignee_guid : sender.guid,
      };

      const createdTask = await this.messageRepository.create(TaskPayload as any);
      const newTask = await this.findMessageByGuid(createdTask.guid);

      if (!newTask) {
        return errorResponse(HttpStatus.NOT_FOUND, 'Task not found after creation');
      }

      return {
        status: 201,
        data: newTask.toJSON(),
        message: 'Task sent successfully',
      };
    } catch (error: any) {
      return errorResponse(HttpStatus.INTERNAL_SERVER_ERROR, 'Task creation failed', error);
    }
  }


  async updateTask(updateDto: UpdateTaskDto) {
    try {
      const { guid, ...updateData } = updateDto;
      const task = await this.messageRepository.findOne({ where: { guid } });
      if (!task) {
        return errorResponse(HttpStatus.NOT_FOUND, 'Task not found');
      }
      await this.messageRepository.update(updateData, {
        where: { guid },
      });
      const updatedTask = await this.findMessageByGuid(guid);
      if (!updatedTask) {
        return errorResponse(HttpStatus.NOT_FOUND, 'Task not found after update');
      }
      return {
        status: 200,
        data: updatedTask.toJSON(),
        message: 'Task updated successfully',
      };
    } catch (error: any) {
      return errorResponse(HttpStatus.INTERNAL_SERVER_ERROR, 'Task update failed', error);
    }
  }


  async deleteMessageOrTask(guid: string) {
    try {
      const record = await this.messageRepository.findOne({ where: { guid } });
      if (!record) {
        return errorResponse(HttpStatus.NOT_FOUND, 'Record not found');
      }
      await this.messageRepository.destroy({ where: { guid } });
      return {
        status: 200,
        message: 'Record deleted successfully',
      };
    } catch (error: any) {
      return errorResponse(HttpStatus.INTERNAL_SERVER_ERROR, 'Delete operation failed', error);
    }
  }
}
