import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminRoleGuard } from '../../guards/admin.guard';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { I18nLang } from 'nestjs-i18n';
import { PermissionsGuard } from '../../guards/permissions.guard';

@ApiTags('Users')
@ApiBearerAuth('bearerAuth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('/employee/users')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) { }


  @Post('/add-user')
  async create(@Body() createUserDto: CreateUserDto, @I18nLang() lang: string) {
    return this.userService.addUser(createUserDto, lang);
  }


  @Get('/get-all-user')
  async findAll(@I18nLang() lang: string, @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
    @Query('isExternalUser') isExternalUser?: string,
  ) {
    const filters = {
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      isExternalUser: isExternalUser !== undefined ? isExternalUser === 'true' : undefined,
    };
    return this.userService.getAllUser(Number(page), Number(limit), search, filters, lang);
  }


  @Patch('/update-user')
  async update(@Body() updateUserDto: UpdateUserDto, @I18nLang() lang: string) {
    return this.userService.updateUser(updateUserDto, lang);
  }



  @Delete('/delete-user')
  @ApiBody({
    schema: {
      type: 'object', properties: {
        guid: { type: 'string' }
      }
    }
  })
  async remove(@Body('guid') guid: string, @I18nLang() lang: string) {
    return this.userService.deleteUser(guid, lang);
  }
}


