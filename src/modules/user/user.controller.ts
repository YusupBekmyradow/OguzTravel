import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminRoleGuard } from '../../guards/admin.guard';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../guards/permissions.guard';

@ApiTags('Users')
@ApiBearerAuth('bearerAuth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('/employee/users')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) { }


  @Post('/add-user')
  async create(@Body() createUserDto: CreateUserDto) {
    return this.userService.addUser(createUserDto);
  }


  @Get('/get-all-user')
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
    @Query('isExternalUser') isExternalUser?: string,
  ) {
    const filters = {
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      isExternalUser: isExternalUser !== undefined ? isExternalUser === 'true' : undefined,
    };
    return this.userService.getAllUser(Number(page), Number(limit), search, filters);
  }


  @Patch('/update-user')
  async update(
    @Body() updateUserDto: UpdateUserDto) {
    return this.userService.updateUser(updateUserDto);
  }



  @Delete('/delete-user')
  @ApiBody({
    schema: {
      type: 'object', properties: {
        guid: { type: 'string' }
      }
    }
  })
  async remove(@Body('guid') guid: string) {
    return this.userService.deleteUser(guid);
  }
}
