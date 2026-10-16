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

const MAX_TASK_PAGE_SIZE = 100;

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
      if (search) {
        whereClause[Op.or] = [
          { title: { [Op.iLike]: `%${search}%` } },
          { description: { [Op.iLike]: `%${search}%` } },
        ];
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


  private parseInstant(value?: string): Date | null {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private getTaskOrderClause(sort?: string): string {
    const fallback = 't."createdAt" DESC, t.guid';
    const match = /^(.+)_(asc|desc)$/i.exec(String(sort || ''));
    if (!match) return fallback;
    const columns: Record<string, string> = {
      title: 't.title',
      status: 't.status',
      due_date: 't.due_date',
      start_date: 't.start_date',
      end_date: 't.end_date',
      createdAt: 't."createdAt"',
      priority: `CASE t.priority WHEN 'urgent' THEN 3 WHEN 'medium' THEN 2 WHEN 'low' THEN 1 ELSE 0 END`,
    };
    const column = columns[match[1]];
    if (!column) return fallback;
    const direction = match[2].toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
    return `${column} ${direction} NULLS LAST, t."createdAt" DESC, t.guid`;
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
    sort?: string,
    due_from?: string,
    due_to?: string,
    cursor?: string,
    date_from?: string,
    date_to?: string,
  ) {
    try {
      const pageNum = Math.max(1, Math.floor(Number(page)) || 1);
      const limitNum = Math.min(MAX_TASK_PAGE_SIZE, Math.max(1, Math.floor(Number(limit)) || 10));
      const offset = (pageNum - 1) * limitNum;
      const isGrouped = type === true || type === 'true';

      const replacements: any = { limit: limitNum, offset };
      const conditions: string[] = ['t."isMessage" = false'];

      if (priority) {
        conditions.push('t.priority = :priority');
        replacements.priority = priority;
      }
      if (status !== undefined && status !== null) {
        conditions.push('t.status = :status');
        replacements.status = Number(status);
      }
      const dueFrom = this.parseInstant(due_from);
      const dueTo = this.parseInstant(due_to);
      if (dueFrom && dueTo) {
        conditions.push('t.due_date >= :dueFrom AND t.due_date < :dueTo');
        replacements.dueFrom = dueFrom;
        replacements.dueTo = dueTo;
      } else if (due_date) {
        conditions.push(`t.due_date >= CAST(:dueDay AS date) AND t.due_date < CAST(:dueDay AS date) + INTERVAL '1 day'`);
        replacements.dueDay = due_date;
      }
      const dateFrom = this.parseInstant(date_from);
      const dateTo = this.parseInstant(date_to);
      if (dateFrom) {
        conditions.push('COALESCE(t.end_date, t.start_date) >= :dateFrom');
        replacements.dateFrom = dateFrom;
      }
      if (dateTo) {
        conditions.push('COALESCE(t.start_date, t.end_date) < :dateTo');
        replacements.dateTo = dateTo;
      }
      if (assignee_guid) {
        conditions.push(`EXISTS (
          SELECT 1 FROM tbl_task_assignees fa
          WHERE fa.task_guid = t.guid AND fa.assignee_guid = :assignee_guid
        )`);
        replacements.assignee_guid = assignee_guid;
      }
      if (search) {
        conditions.push(`(
        t.title ILIKE :search OR
        t.description ILIKE :search OR
        EXISTS (
          SELECT 1 FROM tbl_task_assignees sa
          JOIN tbl_users su ON su.guid = sa.assignee_guid
          JOIN tbl_employees se ON se.guid = su.employee_guid
          WHERE sa.task_guid = t.guid AND se."fullName" ILIKE :search
        )
      )`);
        replacements.search = `%${search}%`;
      }
      const whereClause = `WHERE ${conditions.join(' AND ')}`;

      const isKeyset = cursor !== undefined && cursor !== null && !isGrouped;
      const cursorValue = Number(cursor);
      const hasCursor = isKeyset && Number.isInteger(cursorValue) && cursorValue > 0;
      const buildTaskSelect = (where: string, order: string, paging = '') => `
      SELECT
        t.*,
        COALESCE((
          SELECT JSON_AGG(
            JSON_BUILD_OBJECT(
              'guid', u.guid,
              'phone_number', u.phone_number,
              'fullName', emp."fullName"
            ) ORDER BY emp."fullName"
          )
          FROM tbl_task_assignees ta
          LEFT JOIN tbl_users u ON ta.assignee_guid = u.guid
          LEFT JOIN tbl_employees emp ON u.employee_guid = emp.guid
          WHERE ta.task_guid = t.guid
        ), '[]') AS assignees,
        (
          SELECT JSON_BUILD_OBJECT(
            'guid', adm.guid,
            'phone_number', adm.phone_number,
            'role', adm.role,
            'fullName', adm_emp."fullName"
          )
          FROM tbl_users adm
          LEFT JOIN tbl_employees adm_emp ON adm.employee_guid = adm_emp.guid
          WHERE adm.guid = t.adm_user_guid
        ) AS admuser
      FROM (
        SELECT t.* FROM tbl_messages t
        ${where}
        ORDER BY ${order}
        ${paging}
      ) t
      ORDER BY ${order}
    `;
      const orderClause = this.getTaskOrderClause(sort);
      const countQuery = `
      SELECT COUNT(*)::integer AS total
      FROM tbl_messages t
      ${whereClause}
    `;

      if (isKeyset) {
        const keysetWhere = hasCursor ? `${whereClause} AND t.index_number < :cursor` : whereClause;
        const [rows, countResult]: [any[], any[] | null] = await Promise.all([
          this.sequelize.query(buildTaskSelect(keysetWhere, 't.index_number DESC', 'LIMIT :limitPlusOne'), {
            replacements: { ...replacements, cursor: cursorValue, limitPlusOne: limitNum + 1 },
            type: QueryTypes.SELECT,
          }),
          hasCursor ? null : this.sequelize.query(countQuery, { replacements, type: QueryTypes.SELECT }),
        ]);
        const hasMore = rows.length > limitNum;
        const pageRows = hasMore ? rows.slice(0, limitNum) : rows;
        return {
          status: 200,
          data: pageRows,
          meta: {
            itemCount: pageRows.length,
            itemsPerPage: limitNum,
            nextCursor: hasMore ? pageRows[pageRows.length - 1].index_number : null,
            ...(countResult && { totalItems: countResult[0]?.total || 0 }),
          },
          message: this.i18n.t('messages.listFetched', { lang }),
        };
      }

      if (isGrouped) {
        const allTasks: any[] = await this.sequelize.query(buildTaskSelect(whereClause, orderClause), {
          replacements,
          type: QueryTypes.SELECT,
        });
        const statusGroups: Record<number, any[]> = {};
        for (const task of allTasks) {
          const st = task.status ?? 0;
          (statusGroups[st] = statusGroups[st] || []).push(task);
        }
        return {
          status: 200,
          data: Object.values(statusGroups),
          message: this.i18n.t('messages.listFetched', { lang }),
        };
      }
      const [rows, countResult]: [any[], any[]] = await Promise.all([
        this.sequelize.query(buildTaskSelect(whereClause, orderClause, 'LIMIT :limit OFFSET :offset'), {
          replacements,
          type: QueryTypes.SELECT,
        }),
        this.sequelize.query(countQuery, { replacements, type: QueryTypes.SELECT }),
      ]);
      const count = countResult[0]?.total || 0;
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
      const sender = await this.userRepository.findOne({ where: { guid: senderGuid }, transaction });
      if (!sender) {
        await transaction.rollback();
        return errorResponse(HttpStatus.NOT_FOUND, this.i18n.t('messages.notFound', { lang }));
      }
      const { assignee_guids, ...messageData } = createDto as any;
      let targetGuids: string[] = [];
      if (assignee_guids === true || assignee_guids === 'true') {
        const allUsers = await this.userRepository.findAll({
          attributes: ['guid'],
          raw: true,
          transaction,
        });

        targetGuids = allUsers
          .map((user: any) => user.guid)
          .filter((guid: string) => !!guid);

      }
      else if (Array.isArray(assignee_guids)) {
        targetGuids = assignee_guids;
      }
      const createdMessage = await this.messageRepository.create({
        ...messageData,
        isMessage: true,
        adm_user_guid: sender.guid,
      }, { transaction });
      if (targetGuids.length > 0) {
        const assigneeRecords = targetGuids.map((user_guid: string) => ({
          task_guid: createdMessage.guid,
          assignee_guid: user_guid,
          isRead: false,
        }));
        await this.taskAssigneeRepository.bulkCreate(assigneeRecords as any, { transaction });
      }
      await transaction.commit();
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
      if (!this.resolveTaskDates(taskData)) {
        await transaction.rollback();
        return errorResponse(HttpStatus.BAD_REQUEST, this.i18n.t('messages.invalidDateRange', { lang }));
      }
      assignee_guids = Array.isArray(assignee_guids) ? [...new Set(assignee_guids)] : [];
      const unknownGuids = await this.findUnknownUserGuids(assignee_guids, transaction);
      if (unknownGuids.length > 0) {
        await transaction.rollback();
        return errorResponse(
          HttpStatus.BAD_REQUEST,
          this.i18n.t('messages.assigneeNotFound', { lang }),
          unknownGuids.join(', '),
        );
      }

      const createdTask = await this.messageRepository.create({
        ...taskData,
        isMessage: false,
        adm_user_guid: sender.guid,
      }, { transaction });
      if (Array.isArray(assignee_guids) && assignee_guids.length > 0) {
        const assigneeRecords = assignee_guids.map((user_guid: string) => ({
          task_guid: createdTask.guid,
          assignee_guid: user_guid,
          isRead: false,
        }));
        await this.taskAssigneeRepository.bulkCreate(assigneeRecords as any, { transaction });
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


  private resolveTaskImages(current: string[], keepImages: string[] | undefined, uploaded: string[]): string[] | null {
    if (keepImages === undefined && uploaded.length === 0) return null;
    const kept = keepImages ? keepImages.filter((path) => current.includes(path)) : [];
    return [...kept, ...uploaded];
  }

  private resolveTaskDates(data: any, current?: { start_date?: Date | null; end_date?: Date | null }): boolean {
    if (data.end_date !== undefined) {
      data.due_date = data.end_date;
    } else if (data.due_date !== undefined) {
      data.end_date = data.due_date;
    }
    const start = data.start_date !== undefined ? data.start_date : current?.start_date;
    const end = data.end_date !== undefined ? data.end_date : current?.end_date;
    return !start || !end || new Date(start).getTime() <= new Date(end).getTime();
  }

  private async findUnknownUserGuids(guids: string[], transaction?: any): Promise<string[]> {
    if (guids.length === 0) return [];
    const users = await this.userRepository.findAll({
      attributes: ['guid'],
      where: { guid: { [Op.in]: guids } },
      raw: true,
      transaction,
    });
    const existing = new Set(users.map((user) => user.guid));
    return guids.filter((guid) => !existing.has(guid));
  }

  async updateTask(updateDto: UpdateTaskDto, lang: string = 'tk', uploadedImages: string[] = []) {
    const transaction = await this.sequelize.transaction();
    try {
      let { guid, assignee_guids, images: _ignoredImages, keep_images, ...updateData } = updateDto as any;
      const shouldReplaceAssignees = assignee_guids !== undefined;
      if (!assignee_guids) {
        assignee_guids = [];
      } else if (typeof assignee_guids === 'string') {
        assignee_guids = [assignee_guids];
      } else if (!Array.isArray(assignee_guids)) {
        assignee_guids = Object.values(assignee_guids);
      }
      assignee_guids = [...new Set(assignee_guids)];
      const task = await this.messageRepository.findOne({ where: { guid }, transaction });
      if (!task) {
        await transaction.rollback();
        this.imagesService.deleteFiles(uploadedImages);
        return errorResponse(HttpStatus.NOT_FOUND, this.i18n.t('messages.notFound', { lang }));
      }
      if (!this.resolveTaskDates(updateData, task)) {
        await transaction.rollback();
        this.imagesService.deleteFiles(uploadedImages);
        return errorResponse(HttpStatus.BAD_REQUEST, this.i18n.t('messages.invalidDateRange', { lang }));
      }
      if (shouldReplaceAssignees) {
        const unknownGuids = await this.findUnknownUserGuids(assignee_guids, transaction);
        if (unknownGuids.length > 0) {
          await transaction.rollback();
          this.imagesService.deleteFiles(uploadedImages);
          return errorResponse(
            HttpStatus.BAD_REQUEST,
            this.i18n.t('messages.assigneeNotFound', { lang }),
            unknownGuids.join(', '),
          );
        }
      }

      const currentImages: string[] = Array.isArray(task.images) ? task.images : [];
      const nextImages = this.resolveTaskImages(currentImages, keep_images, uploadedImages);
      if (nextImages) updateData.images = nextImages;

      await this.messageRepository.update(updateData, {
        where: { guid }, transaction
      });

      if (shouldReplaceAssignees) {
        await this.taskAssigneeRepository.destroy({ where: { task_guid: guid }, transaction });
      }
      if (shouldReplaceAssignees && assignee_guids.length > 0) {
        const assigneeRecords = assignee_guids.map((user_guid: string) => ({
          task_guid: guid,
          assignee_guid: user_guid,
          isRead: false,
        }));
        await this.taskAssigneeRepository.bulkCreate(assigneeRecords, { transaction });
      }
      await transaction.commit();
      if (nextImages) {
        this.imagesService.deleteFiles(currentImages.filter((path) => !nextImages.includes(path)));
      }

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
      this.imagesService.deleteFiles(uploadedImages);
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
