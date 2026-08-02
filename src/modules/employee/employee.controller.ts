import { Controller, Get, Post, Body, Patch, Delete, Query, UseGuards } from '@nestjs/common';
import { EmployeeService } from './employee.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Employees')
@ApiBearerAuth('bearerAuth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('/employee')
@Controller('employee')
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) { }

  @Post('/add-employee')
  async create(@Body() createEmployeeDto: CreateEmployeeDto) {
    return this.employeeService.addEmployee(createEmployeeDto);
  }

  @Get('/get-all-employees')
  async getAllEmployee(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search?: string,
    @Query('department_guid') department_guid?: string,
    @Query('office_guid') office_guid?: string,
    @Query('position_guid') position_guid?: string,
  ) {
    const filters = { department_guid, office_guid, position_guid };
    return this.employeeService.getAllEmployee(Number(page), Number(limit), search, filters);
  }

  @Get('/get-employees-for-position')
  async getEmployeeForPosition(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('position_guid') position_guid: string
  ) {
    return this.employeeService.getEmployeeForPosition(Number(page), Number(limit), position_guid);
  }

  @Patch('/update-employee')
  async update(
    @Body() updateEmployeeDto: UpdateEmployeeDto) {
    return this.employeeService.updateEmployee(updateEmployeeDto);
  }

  @Delete('/delete-employee')
  @ApiBody({
    schema: {
      type: 'object', properties: {
        guid: { type: 'string' }
      }
    }
  })
  async remove(@Body('guid') guid: string) {
    return this.employeeService.deleteEmployee(guid);
  }
}