import { Controller, Get, Post, Body, Patch, Param, Delete, Req, UseGuards, Query } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateTaskDto } from './dto/create-tasks.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@ApiTags('Messages & Tasks')
@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) { }


  @Get('/get-all-notification')
  @ApiBearerAuth('bearerAuth')
  @UseGuards(JwtAuthGuard)
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({ name: 'isMessage', required: false, type: Boolean })
  @ApiQuery({ name: 'userGuid', required: false, type: String })
  @ApiQuery({ name: 'isRead', required: false, type: Boolean })
  async getAll(
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Query('isMessage') isMessage?: string,
    @Query('userGuid') userGuid?: string,
    @Query('isRead') isRead?: string,
  ) {
    return this.messagesService.getAllMessagesOrTasks(page, limit, isMessage, userGuid, isRead);
  }


  @Post('/add-message')
  @ApiBearerAuth('bearerAuth')
  @UseGuards(JwtAuthGuard)
  async addMessage(@Req() req, @Body() createDto: CreateMessageDto) {
    const senderGuid = req.user.guid;
    return this.messagesService.addMessage(senderGuid, createDto);
  }


  @Patch('/update-message')
  @ApiBearerAuth('bearerAuth')
  @UseGuards(JwtAuthGuard)
  async updateMessage(@Body() updateDto: UpdateMessageDto) {
    return this.messagesService.updateMessage(updateDto);
  }


  @Post('/add-task')
  @ApiBearerAuth('bearerAuth')
  @UseGuards(JwtAuthGuard)
  async addTask(@Req() req, @Body() createDto: CreateTaskDto) {
    const senderGuid = req.user.guid;
    return this.messagesService.addTask(senderGuid, createDto);
  }


  @Patch('/update-task')
  @ApiBearerAuth('bearerAuth')
  @UseGuards(JwtAuthGuard)
  async updateTask(@Body() updateDto: UpdateTaskDto) {
    return this.messagesService.updateTask(updateDto);
  }

  @Delete('/delete-taskormessage')
  @ApiBearerAuth('bearerAuth')
  @UseGuards(JwtAuthGuard)
  async delete(@Body('guid') guid: string) {
    return this.messagesService.deleteMessageOrTask(guid);
  }
}
