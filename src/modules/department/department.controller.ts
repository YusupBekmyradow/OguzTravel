import { Controller, Get, Post, Body, Patch, Delete, UseGuards } from '@nestjs/common';
import { DepartmentService } from './department.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { I18nLang } from 'nestjs-i18n';

@ApiTags('Departments')
@ApiBearerAuth('bearerAuth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('/employee')
@Controller('department')
export class DepartmentController {
  constructor(private readonly departmentService: DepartmentService) { }

  @Post('/add-department')
  async create(@Body() createDepartmentDto: CreateDepartmentDto, @I18nLang() lang: string) {
    return this.departmentService.addDepartment(createDepartmentDto, lang);
  }

  @Get('/get-all-departments')
  async findAll(@I18nLang() lang: string = 'tk') {
    return this.departmentService.getAllDepartment(lang);
  }

  @Patch('/update-department')
  async update(@Body() updateDepartmentDto: UpdateDepartmentDto, @I18nLang() lang: string) {
    return this.departmentService.updateDepartment(updateDepartmentDto, lang);
  }

  @Delete('/delete-department')
  @ApiBody({ schema: { type: 'object', properties: { guid: { type: 'string' } } } })
  async remove(@Body('guid') guid: string, @I18nLang() lang: string) {
    return this.departmentService.deleteDepartment(guid, lang);
  }
}
