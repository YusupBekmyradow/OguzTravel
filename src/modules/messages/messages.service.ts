import { HttpStatus, Injectable } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
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
import { UpdateReadStatusDto } from './dto/update-read-status.dto';
import { Sequelize } from 'sequelize-typescript';
import { Op, QueryTypes } from 'sequelize';
import { ImagesService } from '../../common/image-upload/image-upload.module';

@Injectable()
export class MessagesService {
  constructor(
    @InjectModel(Message) private readonly messageRepository: typeof Message,
    @InjectModel(User) private readonly userRepository: typeof User,
    @InjectModel(TaskAssignee) private readonly taskAssigneeRepository: typeof TaskAssignee,
    private readonly sequelize: Sequelize,
    private readonly imagesService: ImagesService,
    private readonly i18n: I18nService,
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
    search?: string,
    createdAt?: string,
    lang: string = 'tk',
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
      if (createdAt) {
        whereClause.createdAt = {
          [Op.between]: [`${createdAt} 00:00:00`, `${createdAt} 23:59:59`],
        };
      }
      const employeeIncludeWhere: any = {};
      if (search) {
        employeeIncludeWhere.fullName = { [Op.iLike]: `%${search}%` };
      }
      const { rows, count } = await this.messageRepository.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: 'admuser',
            attributes: ['guid', 'phone_number', 'role'],
            include: [{ model: Employee, as: 'employee', attributes: ['guid', 'fullName'] }],
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
        ],
        limit: limitNum,
        offset,
        order: [['createdAt', 'DESC']],
        distinct: true,
        subQuery: false,
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
        message: this.i18n.t('messages.listFetched', { lang }),
      };
    } catch (error: any) {
      return errorResponse(HttpStatus.INTERNAL_SERVER_ERROR, this.i18n.t('messages.fetchFailed', { lang }), error);
    }
  }

  async getAllTasks(
    page: number = 1,
    limit: number = 10,
    status?: number,
    type?: string | boolean,
    priority?: string,
    due_date?: string,
    search?: string,
    assignee_guid?: string,
    lang: string = 'tk',
  ) {
    try {
      const pageNum = Number(page) || 1;
      const limitNum = Number(limit) || 10;
      const offset = (pageNum - 1) * limitNum;
      const isGrouped = type === true || type === 'true';

      let whereConditions = `WHERE t."isMessage" = false`;
      const replacements: any = { limit: limitNum, offset };

      if (priority) {
        whereConditions += ` AND t.priority = :priority`;
        replacements.priority = priority;
      }
      if (status !== undefined) {
        whereConditions += ` AND t.status = :status`;
        replacements.status = Number(status);
      }
      if (due_date) {
        whereConditions += ` AND t.due_date BETWEEN :startDate AND :endDate`;
        replacements.startDate = `${due_date} 00:00:00`;
        replacements.endDate = `${due_date} 23:59:59`;
      }
      if (search) {
        whereConditions += ` AND emp."fullName" ILIKE :search`;
        replacements.search = `%${search}%`;
      }
      if (assignee_guid) {
        whereConditions += ` AND ta.assignee_guid = :assignee_guid`;
        replacements.assignee_guid = assignee_guid;
      }

      const baseQuery = `
        SELECT 
          t.*,
          COALESCE(
            JSON_AGG(
              DISTINCT JSONB_BUILD_OBJECT(
                'guid', u.guid,
                'phone_number', u.phone_number,
                'fullName', emp."fullName"
              )
            ) FILTER (WHERE ta.task_guid IS NOT NULL), '[]'
          ) AS assignees,
          COALESCE(
            JSON_BUILD_OBJECT(
              'guid', adm.guid,
              'phone_number', adm.phone_number,
              'role', adm.role,
              'fullName', adm_emp."fullName"
            ), NULL
          ) AS admuser
        FROM tbl_messages t
        LEFT JOIN tbl_task_assignees ta ON t.guid = ta.task_guid
        LEFT JOIN tbl_users u ON ta.assignee_guid = u.guid
        LEFT JOIN tbl_employees emp ON u.employee_guid = emp.guid
        LEFT JOIN tbl_users adm ON t.adm_user_guid = adm.guid
        LEFT JOIN tbl_employees adm_emp ON adm.employee_guid = adm_emp.guid
        ${whereConditions}
        GROUP BY t.guid, adm.guid, adm_emp.guid
        ORDER BY t."createdAt" DESC
      `;

      if (isGrouped) {
        const allTasks = await this.sequelize.query(baseQuery, {
          replacements,
          type: QueryTypes.SELECT,
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
          message: this.i18n.t('messages.listFetched', { lang }),
        };
      }

      const countQuery = `
        SELECT COUNT(DISTINCT t.guid) as total
        FROM tbl_messages t
        LEFT JOIN tbl_task_assignees ta ON t.guid = ta.task_guid
        LEFT JOIN tbl_users u ON ta.assignee_guid = u.guid
        LEFT JOIN tbl_employees emp ON u.employee_guid = emp.guid
        ${whereConditions}
      `;
      const countResult: any = await this.sequelize.query(countQuery, {
        replacements,
        type: QueryTypes.SELECT,
      });
      const count = Number(countResult[0]?.total || 0);

      const paginatedQuery = `${baseQuery} LIMIT :limit OFFSET :offset`;
      const rows = await this.sequelize.query(paginatedQuery, {
        replacements,
        type: QueryTypes.SELECT,
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
        message: this.i18n.t('messages.listFetched', { lang }),
      };
    } catch (error: any) {
      return errorResponse(HttpStatus.INTERNAL_SERVER_ERROR, this.i18n.t('messages.fetchFailed', { lang }), error);
    }
  }

  async getTasksByStatus(
    status?: number,
    page: number = 1,
    limit: number = 10,
    lang: string = 'tk',
  ) {
    try {
      const pageNum = Number(page) || 1;
      const limitNum = Number(limit) || 10;
      const offset = (pageNum - 1) * limitNum;

      const statusVal = status !== undefined ? Number(status) : null;
      const countQuery = `
        SELECT COUNT(*) as total 
        FROM "tbl_messages" 
        WHERE (:statusVal::int IS NULL OR "status" = :statusVal)
      `;
      const countResult: any = await this.sequelize.query(
        countQuery,
        {
          replacements: { statusVal },
          type: QueryTypes.SELECT,
        },
      );
      const totalItems = Number(countResult[0]?.total || 0);
      const dataQuery = `
        SELECT 
          m.*,
          (
            SELECT json_build_object(
              'guid', u.guid,
              'phone_number', u.phone_number,
              'role', u.role,
              'employee', (
                SELECT json_build_object('guid', e.guid, 'fullName', e."fullName")
                FROM "tbl_employees" e
                WHERE e.guid = u.employee_guid
              )
            )
            FROM "tbl_users" u
            WHERE u.guid = m.adm_user_guid
          ) as admuser,
          COALESCE(
            (
              SELECT json_agg(
                json_build_object(
                  'guid', ta.guid,
                  'task_guid', ta.task_guid,
                  'assignee_guid', ta.assignee_guid,
                  'isRead', ta."isRead",
                  'createdAt', ta."createdAt",
                  'updatedAt', ta."updatedAt",
                  'user', (
                    SELECT json_build_object(
                      'guid', tu.guid,
                      'phone_number', tu.phone_number,
                      'role', tu.role,
                      'employee', (
                        SELECT json_build_object('guid', te.guid, 'fullName', te."fullName")
                        FROM "tbl_employees" te
                        WHERE te.guid = tu.employee_guid
                      )
                    )
                    FROM "tbl_users" tu
                    WHERE tu.guid = ta.assignee_guid
                  )
                )
              )
              FROM "tbl_task_assignees" ta
              WHERE ta.task_guid = m.guid
            ),
            '[]'::json
          ) as "empltaskAssignee"
        FROM "tbl_messages" m
        WHERE (:statusVal::int IS NULL OR m."status" = :statusVal)
        ORDER BY m."createdAt" DESC
        LIMIT :limitNum OFFSET :offset
      `;

      const rows = await this.sequelize.query(
        dataQuery,
        {
          replacements: { statusVal, limitNum, offset },
          type: QueryTypes.SELECT,
        },
      );

      return {
        status: 200,
        data: rows,
        meta: {
          totalItems: totalItems,
          itemCount: rows.length,
          itemsPerPage: limitNum,
          totalPages: Math.ceil(totalItems / limitNum),
          currentPage: pageNum,
        },
        message: this.i18n.t('messages.listFetched', { lang }),
      };
    } catch (error: any) {
      return errorResponse(HttpStatus.INTERNAL_SERVER_ERROR, this.i18n.t('messages.fetchFailed', { lang }), error);
    }
  }

  async addMessage(senderGuid: string, createDto: CreateMessageDto, lang: string = 'tk') {
    const transaction = await this.sequelize.transaction();
    try {
      const sender = await this.userRepository.findOne({ where: { guid: senderGuid }, transaction, });
      if (!sender) { await transaction.rollback(); return errorResponse(HttpStatus.NOT_FOUND, this.i18n.t('messages.notFound', { lang })); }

      const { assignee_guids, ...messageData } = createDto as any;
      const createdMessage = await this.messageRepository.create({
        ...messageData,
        isMessage: true,
        adm_user_guid: sender.guid,
      }, { transaction, });

      if (assignee_guids && assignee_guids.length > 0) {
        const assigneeRecords = assignee_guids.map((user_guid: string) => ({
          task_guid: createdMessage.guid,
          assignee_guid: user_guid,
          isRead: false,
        }));
        await this.taskAssigneeRepository.bulkCreate(assigneeRecords, { transaction, });
      } await transaction.commit();
      const newMessage = await this.findMessageByGuid(createdMessage.guid);
      return { status: 201, data: newMessage, message: this.i18n.t('messages.created', { lang }) };
    } catch (error: any) {
      await transaction.rollback();
      return errorResponse(HttpStatus.INTERNAL_SERVER_ERROR, this.i18n.t('messages.createFailed', { lang }), error);
    }
  }

  async addTask(senderGuid: string, createDto: CreateTaskDto, lang: string = 'tk') {
    const transaction = await this.sequelize.transaction();
    try {
      const sender = await this.userRepository.findOne({ where: { guid: senderGuid }, transaction });
      if (!sender) {
        await transaction.rollback();
        return errorResponse(HttpStatus.NOT_FOUND, this.i18n.t('messages.notFound', { lang }));
      }
      let { assignee_guids, ...taskData } = createDto as any;
      if (!assignee_guids) {
        assignee_guids = [];
      } else if (typeof assignee_guids === 'string') {
        assignee_guids = [assignee_guids];
      } else if (!Array.isArray(assignee_guids)) {
        assignee_guids = Object.values(assignee_guids);
      }
      const createdTask = await this.messageRepository.create({
        ...taskData,
        isMessage: false,
        adm_user_guid: sender.guid,
      }, { transaction });
      if (assignee_guids.length > 0) {
        const assigneeRecords = assignee_guids.map((user_guid: string) => ({
          task_guid: createdTask.guid,
          assignee_guid: user_guid,
          isRead: false,
        }));
        await this.taskAssigneeRepository.bulkCreate(assigneeRecords, { transaction });
      }
      await transaction.commit();
      const newTask = await this.findMessageByGuid(createdTask.guid);
      return { status: 201, data: newTask, message: this.i18n.t('messages.created', { lang }) };
    } catch (error: any) {
      await transaction.rollback();
      return errorResponse(HttpStatus.INTERNAL_SERVER_ERROR, this.i18n.t('messages.createFailed', { lang }), error);
    }
  }

  async updateMessage(updateDto: UpdateMessageDto, lang: string = 'tk') {
    const transaction = await this.sequelize.transaction();
    try {
      const { guid, assignee_guids, ...updateData } = updateDto as any;

      const message = await this.messageRepository.findOne({ where: { guid }, transaction });
      if (!message) {
        await transaction.rollback(); return errorResponse(HttpStatus.NOT_FOUND, this.i18n.t('messages.notFound', { lang }));
      }
      if (!updateData.images || updateData.images.length === 0) {
        delete updateData.images;
      }
      await this.messageRepository.update(updateData, { where: { guid }, transaction });

      if (assignee_guids) {
        await this.taskAssigneeRepository.destroy({ where: { task_guid: guid }, transaction });
        if (assignee_guids.length > 0) {
          const assigneeRecords = assignee_guids.map((user_guid: string) => ({
            task_guid: guid,
            assignee_guid: user_guid,
            isRead: false,
          }));
          await this.taskAssigneeRepository.bulkCreate(assigneeRecords, { transaction });
        }
      }
      await transaction.commit();
      const updatedRecord = await this.findMessageByGuid(guid);
      return { status: 200, data: updatedRecord, message: this.i18n.t('messages.updated', { lang }) };
    } catch (error: any) {
      await transaction.rollback();
      return errorResponse(HttpStatus.INTERNAL_SERVER_ERROR, this.i18n.t('messages.updateFailed', { lang }), error);
    }
  }

  async updateTask(updateDto: UpdateTaskDto, lang: string = 'tk') {
    const transaction = await this.sequelize.transaction();
    try {
      let { guid, assignee_guids, images, ...updateData } = updateDto as any;
      if (!assignee_guids) {
        assignee_guids = [];
      } else if (typeof assignee_guids === 'string') {
        assignee_guids = [assignee_guids];
      } else if (!Array.isArray(assignee_guids)) {
        assignee_guids = Object.values(assignee_guids);
      }
      const task = await this.messageRepository.findOne({ where: { guid }, transaction });
      if (!task) {
        await transaction.rollback();
        return errorResponse(HttpStatus.NOT_FOUND, this.i18n.t('messages.notFound', { lang }));
      }

      if (images && images.length > 0 && task.images && Array.isArray(task.images)) {
        this.imagesService.deleteFiles(task.images);
        updateData.images = images.map((file: any) => file.path || file);
      }

      await this.messageRepository.update(updateData, {
        where: { guid }, transaction
      });

      await this.taskAssigneeRepository.destroy({ where: { task_guid: guid }, transaction });
      if (assignee_guids.length > 0) {
        const assigneeRecords = assignee_guids.map((user_guid: string) => ({
          task_guid: guid,
          assignee_guid: user_guid,
          isRead: false,
        }));
        await this.taskAssigneeRepository.bulkCreate(assigneeRecords, { transaction });
      }
      await transaction.commit();
      const updatedTask = await this.findMessageByGuid(guid);
      if (!updatedTask) {
        return errorResponse(HttpStatus.NOT_FOUND, this.i18n.t('messages.notFound', { lang }));
      }
      return {
        status: 200,
        data: updatedTask.toJSON(),
        message: this.i18n.t('messages.updated', { lang }),
      };
    } catch (error: any) {
      await transaction.rollback();
      return errorResponse(HttpStatus.INTERNAL_SERVER_ERROR, this.i18n.t('messages.updateFailed', { lang }), error);
    }
  }

  async deleteMessageOrTask(guid: string, lang: string = 'tk') {
    const transaction = await this.sequelize.transaction();
    try {
      const record = await this.messageRepository.findOne({ where: { guid }, transaction });
      if (!record) {
        await transaction.rollback();
        return errorResponse(HttpStatus.NOT_FOUND, this.i18n.t('messages.notFound', { lang }));
      }
      await this.messageRepository.destroy({ where: { guid }, transaction });
      await transaction.commit();

      if (record.images && Array.isArray(record.images) && record.images.length > 0) {
        this.imagesService.deleteFiles(record.images);
      }
      return { status: 200, message: this.i18n.t('messages.deleted', { lang }) };
    } catch (error: any) {
      await transaction.rollback();
      return errorResponse(HttpStatus.INTERNAL_SERVER_ERROR, this.i18n.t('messages.deleteFailed', { lang }), error);
    }
  }

  async markAsRead(updateReadStatusDto: UpdateReadStatusDto, lang: string = 'tk') {
    const transaction = await this.sequelize.transaction();
    try {
      const { task_guids, assignee_guids } = updateReadStatusDto;
      const hasTaskGuids = task_guids && task_guids.length > 0;
      const hasAssigneeGuids = assignee_guids && assignee_guids.length > 0;
      if (!hasTaskGuids && !hasAssigneeGuids) {
        await transaction.rollback();
        return errorResponse(
          HttpStatus.BAD_REQUEST,
          this.i18n.t('messages.notFound', { lang }),
        );
      }
      const whereClause: any = {};
      if (hasTaskGuids) {
        whereClause[Op.or] = [
          { task_guid: { [Op.in]: task_guids } },
          { guid: { [Op.in]: task_guids } },
        ];
      }
      if (hasAssigneeGuids) {
        whereClause.assignee_guid = { [Op.in]: assignee_guids };
      }
      const [affectedCount] = await this.taskAssigneeRepository.update(
        { isRead: true },
        { where: whereClause, transaction },
      );
      await transaction.commit();
      return {
        status: 200,
        data: { updatedCount: affectedCount },
        message: this.i18n.t('messages.updated', { lang }),
      };
    } catch (error: any) {
      await transaction.rollback();
      return errorResponse(HttpStatus.INTERNAL_SERVER_ERROR, this.i18n.t('messages.updateFailed', { lang }), error);
    }
  }
}
