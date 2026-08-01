import { HttpStatus, Injectable } from '@nestjs/common';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { InjectModel } from '@nestjs/sequelize';
import { Message } from './entities/message.entity';
import { User } from '../user/entities/user.entity';
import { errorResponse } from '../../helpers/responseFunctions';
import { Employee } from '../employee/entities/employee.entity';
import { TaskAssignee } from './entities/task_assignees.entity';
import { CreateTaskDto } from './dto/create-tasks.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { Op } from 'sequelize';

@Injectable()
export class MessagesService {
  constructor(
    @InjectModel(Message) private readonly messageRepository: typeof Message,
    @InjectModel(User) private readonly userRepository: typeof User,
    @InjectModel(TaskAssignee) private readonly taskAssigneeRepository: typeof TaskAssignee,
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
        model: TaskAssignee,
        as: 'empltaskAssignee',
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['guid', 'phone_number', 'role'],
            include: [{ model: Employee, attributes: ['guid', 'fullName'] }],
          },
        ],
      },
    ];
  }

  private async findMessageByGuid(guid: string): Promise<Message | null> {
    return this.messageRepository.findOne({
      where: { guid },
      include: this.getIncludes(),
    });
  }



async getAllNotification(
    page: number = 1,
    limit: number = 10,
    assignee_guid?: string,
    isRead?: string,
  ) {
    try {
      const pageNum = Number(page) || 1;
      const limitNum = Number(limit) || 10;
      const offset = (pageNum - 1) * limitNum;
      const whereClause: any = {};
      const taskAssigneeWhere: any = {};
      if (assignee_guid) {
        taskAssigneeWhere.assignee_guid = assignee_guid;
      }
      if (isRead !== undefined) {
        taskAssigneeWhere.isRead = isRead === 'true';
      }

      const { rows, count } = await this.messageRepository.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: 'admuser',
            attributes: ['guid', 'phone_number', 'role'],
            include: [{ model: Employee, attributes: ['guid', 'fullName'] }],
          },
          {
            model: TaskAssignee,
            as: 'empltaskAssignee',
            where: Object.keys(taskAssigneeWhere).length > 0 ? taskAssigneeWhere : undefined,
            required: !!assignee_guid || isRead !== undefined,
            include: [
              {
                model: User,
                as: 'user',
                attributes: ['guid', 'phone_number', 'role'],
                include: [
                  {
                    model: Employee,
                    as: 'employee',
                    attributes: ['guid', 'fullName'],
                  },
                ],
              },
            ],
          },
        ],
        limit: limitNum,
        offset,
        order: [['createdAt', 'DESC']],
        distinct: true,
      });

      return {
        status: 200,
        data: rows,
        meta: {
          totalItems: count,
          itemCount: rows.length,
          itemsPerPage: limitNum,
          totalPages: Math.ceil(count / limitNum),
          currentPage: pageNum,
        },
        message: 'All notifications and tasks fetched successfully',
      };
    } catch (error: any) {
      return errorResponse(HttpStatus.INTERNAL_SERVER_ERROR, 'Fetch failed', error);
    }
  }



async getAllTasks(
    page: number = 1,
    limit: number = 10,
    assignee_guid?: string,
    isRead?: string,
    priority?: string,
    status?: number,
    due_date?: string,
    search?: string,
    type?: string | boolean,
  ) {
    try {
      const pageNum = Number(page) || 1;
      const limitNum = Number(limit) || 10;
      const offset = (pageNum - 1) * limitNum;

      const whereClause: any = { isMessage: false };

      if (priority) whereClause.priority = priority;
      if (status !== undefined) whereClause.status = Number(status);
      if (due_date) {
        whereClause.due_date = {
          [Op.between]: [`${due_date} 00:00:00`, `${due_date} 23:59:59`],
        };
      }
      const taskAssigneeWhere: any = {};
      if (assignee_guid) taskAssigneeWhere.assignee_guid = assignee_guid;
      if (isRead !== undefined) taskAssigneeWhere.isRead = isRead === 'true';

      const employeeIncludeWhere: any = {};
      if (search) employeeIncludeWhere.fullName = { [Op.iLike]: `%${search}%` };

      const includeOptions = [
        {
          model: User,
          as: 'admuser',
          attributes: ['guid', 'phone_number', 'role'],
          include: [{ model: Employee, attributes: ['guid', 'fullName'] }],
        },
        {
          model: TaskAssignee,
          as: 'empltaskAssignee',
          where: Object.keys(taskAssigneeWhere).length > 0 ? taskAssigneeWhere : undefined,
          required: !!assignee_guid || isRead !== undefined || !!search,
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['guid', 'phone_number', 'role'],
              include: [
                {
                  model: Employee,
                  as: 'employee',
                  where: Object.keys(employeeIncludeWhere).length > 0 ? employeeIncludeWhere : undefined,
                  required: !!search,
                  attributes: ['guid', 'fullName'],
                },
              ],
            },
          ],
        },
      ];

      const isGrouped = type === true || type === 'true';
      if (isGrouped) {
        const allTasks = await this.messageRepository.findAll({
          where: whereClause,
          include: includeOptions,
          order: [['createdAt', 'DESC']],
        });

        const statusGroups: { [key: number]: any[] } = {};
        allTasks.forEach((task: any) => {
          const st = task.status !== undefined && task.status !== null ? Number(task.status) : 0;
          if (!statusGroups[st]) statusGroups[st] = [];
          statusGroups[st].push(task);
        });

        return {
          status: 200,
          data: Object.values(statusGroups),
          message: 'Tasks grouped by status successfully',
        };
      }

      const { rows, count } = await this.messageRepository.findAndCountAll({
        where: whereClause,
        include: includeOptions,
        limit: limitNum,
        offset,
        order: [['createdAt', 'DESC']],
        distinct: true,
      });

      return {
        status: 200,
        data: rows,
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



  async addMessage(senderGuid: string, createDto: CreateMessageDto) {
    try {
      const sender = await this.userRepository.findOne({ where: { guid: senderGuid } });
      if (!sender) return errorResponse(HttpStatus.NOT_FOUND, 'Sender user not found');

      const { assignee_guids, ...messageData } = createDto as any;
      const createdMessage = await this.messageRepository.create({
        ...messageData,
        isMessage: true,
        adm_user_guid: sender.guid,
      });

      if (assignee_guids && assignee_guids.length > 0) {
        const assigneeRecords = assignee_guids.map((user_guid: string) => ({
          task_guid: createdMessage.guid,
          assignee_guid: user_guid,
          isRead: false,
        }));
        await this.taskAssigneeRepository.bulkCreate(assigneeRecords);
      }
      const newMessage = await this.findMessageByGuid(createdMessage.guid);
      return { status: 201, data: newMessage, message: 'Message sent successfully' };
    } catch (error: any) {
      return errorResponse(HttpStatus.INTERNAL_SERVER_ERROR, 'Message creation failed', error);
    }
  }


  async addTask(senderGuid: string, createDto: CreateTaskDto) {
    try {
      const sender = await this.userRepository.findOne({ where: { guid: senderGuid } });
      if (!sender) return errorResponse(HttpStatus.NOT_FOUND, 'Sender user not found');

      const { assignee_guids, ...taskData } = createDto as any;
      const createdTask = await this.messageRepository.create({
        ...taskData,
        isMessage: false,
        adm_user_guid: sender.guid,
      });

      if (assignee_guids && assignee_guids.length > 0) {
        const assigneeRecords = assignee_guids.map((user_guid: string) => ({
          task_guid: createdTask.guid,
          assignee_guid: user_guid,
          isRead: false,
        }));
        await this.taskAssigneeRepository.bulkCreate(assigneeRecords);
      }

      const newTask = await this.findMessageByGuid(createdTask.guid);
      return { status: 201, data: newTask, message: 'Task sent successfully' };
    } catch (error: any) {
      return errorResponse(HttpStatus.INTERNAL_SERVER_ERROR, 'Task creation failed', error);
    }
  }



  async updateMessage(updateDto: UpdateMessageDto) {
    try {
      const { guid, assignee_guids, ...updateData } = updateDto as any;
      const message = await this.messageRepository.findOne({ where: { guid } });
      if (!message) return errorResponse(HttpStatus.NOT_FOUND, 'Record not found');

      await this.messageRepository.update(updateData, { where: { guid } });

      if (assignee_guids) {
        await this.taskAssigneeRepository.destroy({ where: { task_guid: guid } });
        if (assignee_guids.length > 0) {
          const assigneeRecords = assignee_guids.map((user_guid: string) => ({
            task_guid: guid,
            assignee_guid: user_guid,
            isRead: false,
          }));
          await this.taskAssigneeRepository.bulkCreate(assigneeRecords);
        }
      }
      const updatedRecord = await this.findMessageByGuid(guid);
      return { status: 200, data: updatedRecord, message: 'Record updated successfully' };
    } catch (error: any) {
      return errorResponse(HttpStatus.INTERNAL_SERVER_ERROR, 'Update failed', error);
    }
  }



  async updateTask(updateDto: UpdateTaskDto) {
    try {
      const { guid, assignee_guids, ...updateData } = updateDto as any;
      const task = await this.messageRepository.findOne({ where: { guid } });
      if (!task) {
        return errorResponse(HttpStatus.NOT_FOUND, 'Task not found');
      }
      await this.messageRepository.update(updateData, {
        where: { guid },
      });
      if (assignee_guids) {
        await this.taskAssigneeRepository.destroy({ where: { task_guid: guid } });
        if (assignee_guids.length > 0) {
          const assigneeRecords = assignee_guids.map((user_guid: string) => ({
            task_guid: guid,
            assignee_guid: user_guid,
            isRead: false,
          }));
          await this.taskAssigneeRepository.bulkCreate(assigneeRecords);
        }
      }
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
      if (!record) return errorResponse(HttpStatus.NOT_FOUND, 'Record not found');

      await this.messageRepository.destroy({ where: { guid } });
      return { status: 200, message: 'Record deleted successfully' };
    } catch (error: any) {
      return errorResponse(HttpStatus.INTERNAL_SERVER_ERROR, 'Delete operation failed', error);
    }
  }
}