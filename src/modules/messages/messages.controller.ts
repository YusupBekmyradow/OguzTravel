import { Controller, Get, Post, Body, Patch, Param, Delete, Req, UseGuards, Query } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateTaskDto } from './dto/create-tasks.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { UpdateReadStatusDto } from './dto/update-read-status.dto';

import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../guards/permissions.guard';

@ApiTags('Messages & Tasks')
@ApiBearerAuth('bearerAuth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('/notifications', '/tasks')
@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) { }


  @Get('/get-all-notification')
  @ApiBearerAuth('bearerAuth')
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({ name: 'assignee_guid', required: false })
  @ApiQuery({ name: 'isRead', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'createdAt', required: false})
  async getAll(
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Query('assignee_guid') assignee_guid?: string,
    @Query('isRead') isRead?: string,
    @Query('search') search?: string,
    @Query('createdAt') createdAt?: string,
  ) {
    return this.messagesService.getAllNotification(
      page,
      limit,
      assignee_guid,
      isRead,
      search,
      createdAt,
    );
  }


  @Get('/get-all-tasks')
  @ApiBearerAuth('bearerAuth')
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  async getAllTasks(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('assignee_guid') assignee_guid?: string,
    @Query('isRead') isRead?: string,
    @Query('priority') priority?: string,
    @Query('status') status?: number,
    @Query('due_date') due_date?: string,
    @Query('search') search?: string,
    @Query('type') type?: string,
  ) {
    return this.messagesService.getAllTasks(page,
      limit,
      assignee_guid,
      isRead,
      priority,
      status ? Number(status) : undefined,
      due_date,
      search,
      type,
    );
  }


  @Post('/add-message')
  @ApiBearerAuth('bearerAuth')
  async addMessage(@Req() req, @Body() createDto: CreateMessageDto) {
    const senderGuid = req.user.guid;
    return this.messagesService.addMessage(senderGuid, createDto);
  }


  @Patch('/update-message')
  @ApiBearerAuth('bearerAuth')
  async updateMessage(@Body() updateDto: UpdateMessageDto) {
    return this.messagesService.updateMessage(updateDto);
  }


  @Post('/add-task')
  @ApiBearerAuth('bearerAuth')
  async addTask(@Req() req, @Body() createDto: CreateTaskDto) {
    const senderGuid = req.user.guid;
    return this.messagesService.addTask(senderGuid, createDto);
  }


  @Patch('/update-task')
  @ApiBearerAuth('bearerAuth')
  async updateTask(@Body() updateDto: UpdateTaskDto) {
    return this.messagesService.updateTask(updateDto);
  }

  @Delete('/delete-taskormessage')
  @ApiBearerAuth('bearerAuth')
  async delete(@Body('guid') guid: string) {
    return this.messagesService.deleteMessageOrTask(guid);
  }

  @Patch('/notification-read')
  @ApiBearerAuth('bearerAuth')
  async markAsRead(@Body() updateReadStatusDto: UpdateReadStatusDto) {
    return this.messagesService.markAsRead(updateReadStatusDto);
  }
}
