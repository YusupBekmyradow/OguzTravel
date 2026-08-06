import { Controller, Get, Post, Body, Patch, Delete, Query, UseGuards } from '@nestjs/common';
import { EmployeeService } from './employee.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { I18nLang } from 'nestjs-i18n';

@ApiTags('Employees')
@ApiBearerAuth('bearerAuth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('/employee')
@Controller('employee')
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) { }

  @Post('/add-employee')
  async create(
    @Body() createEmployeeDto: CreateEmployeeDto,
    @I18nLang() lang: string,
  ) {
    return this.employeeService.addEmployee(createEmployeeDto, lang);
  }

  @Get('/get-all-employees')
  async getAllEmployee(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search?: string,
    @Query('department_guid') department_guid?: string,
    @Query('office_guid') office_guid?: string,
    @Query('position_guid') position_guid?: string,
    @I18nLang() lang: string = 'tk',
  ) {
    const filters = { department_guid, office_guid, position_guid };
    return this.employeeService.getAllEmployee(Number(page), Number(limit), search, filters, lang);
  }

  @Get('/get-employees-for-position')
  async getEmployeeForPosition(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('position_guid') position_guid: string,
    @I18nLang() lang: string = 'tk',
  ) {
    return this.employeeService.getEmployeeForPosition(Number(page), Number(limit), position_guid, lang);
  }

  @Patch('/update-employee')
  async update(
    @Body() updateEmployeeDto: UpdateEmployeeDto,
    @I18nLang() lang: string,
  ) {
    return this.employeeService.updateEmployee(updateEmployeeDto, lang);
  }

  @Delete('/delete-employee')
  @ApiBody({
    schema: {
      type: 'object', properties: {
        guid: { type: 'string' }
      }
    }
  })
  async remove(
    @Body('guid') guid: string,
    @I18nLang() lang: string,
  ) {
    return this.employeeService.deleteEmployee(guid, lang);
  }
}