import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { EmployeeService } from './employee.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { ApiBody, ApiTags } from '@nestjs/swagger';

@ApiTags('Employees')
@Controller('employee')
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) { }

  @Post('/add-employee')
  async create(@Body() createEmployeeDto: CreateEmployeeDto) {
    return this.employeeService.addEmployee(createEmployeeDto);
  }

  @Get('/get-all-employees')
  async findAll(
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