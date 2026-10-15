import { Controller, Get, Post, Body, Patch, Param, Delete, Req, UseGuards, Query, UseInterceptors, UploadedFiles } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateTaskDto } from './dto/create-tasks.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { UpdateReadStatusDto } from './dto/update-read-status.dto';

import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { I18nLang } from 'nestjs-i18n';
import { PermissionsGuard } from '../../guards/permissions.guard';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ImagesService } from '../../common/image-upload/image-upload.module';

@ApiTags('Notification & Tasks')
@ApiBearerAuth('bearerAuth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('messages')
export class MessagesController {
  constructor(
    private readonly messagesService: MessagesService,
    private readonly imagesService: ImagesService
  ) { }

  @Get('/get-all-notification')
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({ name: 'assignee_guid', required: false })
  @ApiQuery({ name: 'isRead', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'createdAt', required: false })
  async getAll(
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Query('assignee_guid') assignee_guid?: string,
    @Query('isRead') isRead?: string,
    @Query('search') search?: string,
    @Query('createdAt') createdAt?: string,
    @I18nLang() lang: string = 'tk',
  ) {
    return this.messagesService.getAllNotification(
      page,
      limit,
      assignee_guid,
      isRead,
      search,
      createdAt,
      lang,
    );
  }

  @RequirePermissions('/tasks')
  @Get('/get-all-tasks')
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({ name: 'status', required: false, example: 1 })
  @ApiQuery({ name: 'type', required: false, example: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'priority', required: false, example: 'urgent' })
  @ApiQuery({ name: 'due_date', required: false })
  @ApiQuery({ name: 'assignee_guid', required: false })
  @ApiQuery({ name: 'sort', required: false, example: 'due_date_desc' })
  @ApiQuery({ name: 'due_from', required: false, description: 'ISO instant, inclusive' })
  @ApiQuery({ name: 'due_to', required: false, description: 'ISO instant, exclusive' })
  @ApiQuery({
    name: 'date_from',
    required: false,
    description: 'ISO instant, inclusive: tasks whose start_date → end_date window overlaps [date_from, date_to)',
  })
  @ApiQuery({ name: 'date_to', required: false, description: 'ISO instant, exclusive' })
  @ApiQuery({
    name: 'cursor',
    required: false,
    description: 'Keyset pagination: send empty for the first page, then meta.nextCursor',
  })
  async getAllTasks(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: number,
    @Query('type') type?: string,
    @Query('priority') priority?: string,
    @Query('due_date') due_date?: string,
    @Query('search') search?: string,
    @Query('assignee_guid') assignee_guid?: string,
    @Query('sort') sort?: string,
    @Query('due_from') due_from?: string,
    @Query('due_to') due_to?: string,
    @Query('cursor') cursor?: string,
    @Query('date_from') date_from?: string,
    @Query('date_to') date_to?: string,
    @I18nLang() lang: string = 'tk',
  ) {
    return this.messagesService.getAllTasks(
      page ? Number(page) : 1,
      limit ? Number(limit) : 10,
      status ? Number(status) : undefined,
      type === 'true',
      priority,
      due_date,
      search,
      assignee_guid,
      lang,
      sort,
      due_from,
      due_to,
      cursor,
      date_from,
      date_to,
    );
  }

  @RequirePermissions('/tasks')
  @Get('/get-tasks-by-status')
  @ApiQuery({ name: 'status', required: true, example: 1 })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  async getTasksByStatus(
    @Query('status') status: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @I18nLang() lang: string = 'tk',
  ) {
    return this.messagesService.getTasksByStatus(
      status ? Number(status) : undefined,
      page ? Number(page) : 1,
      limit ? Number(limit) : 10,
      lang,
    );
  }

  @Post('/add-notification')
  async addMessage(
    @Req() req,
    @Body() createDto: CreateMessageDto,
    @I18nLang() lang: string = 'tk',
  ) {
    const senderGuid = req.user.guid;
    return this.messagesService.addMessage(senderGuid, createDto, lang);
  }

  @Patch('/update-notification')
  async updateMessage(
    @Body() updateDto: UpdateMessageDto,
    @I18nLang() lang: string = 'tk',
  ) {
    return this.messagesService.updateMessage(updateDto, lang);
  }

  @RequirePermissions('/tasks')
  @Post('/add-task')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('images', 10))
  async addTask(
    @Req() req,
    @Body() createDto: CreateTaskDto,
    @UploadedFiles() files: Express.Multer.File[],
    @I18nLang() lang: string = 'tk',
  ) {
    const senderGuid = req.user.guid;
    if (files && files.length > 0) {
      const savedImages = await this.imagesService.saveImages(files);
      createDto.images = savedImages;
    }
    return this.messagesService.addTask(senderGuid, createDto, lang);
  }

  @RequirePermissions('/tasks')
  @Patch('/update-task')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('images', 10))
  async updateTask(
    @Body() updateDto: UpdateTaskDto,
    @UploadedFiles() files: Express.Multer.File[],
    @I18nLang() lang: string = 'tk',
  ) {
    const uploadedImages = files && files.length > 0 ? await this.imagesService.saveImages(files) : [];
    return this.messagesService.updateTask(updateDto, lang, uploadedImages);
  }

  @Delete('/delete-notificOrmessage')
  @ApiBody({
    schema: {
      type: 'object', properties: {
        guid: { type: 'string' }
      }
    }
  })
  async delete(
    @Body('guid') guid: string,
    @I18nLang() lang: string = 'tk',
  ) {
    return this.messagesService.deleteMessageOrTask(guid, lang);
  }

  @Patch('/notification-read')
  async markAsRead(
    @Body() updateReadStatusDto: UpdateReadStatusDto,
    @I18nLang() lang: string = 'tk',
  ) {
    return this.messagesService.markAsRead(updateReadStatusDto, lang);
  }
}
