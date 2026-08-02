import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { DepartmentService } from './department.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../../guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Departments')
@ApiBearerAuth('bearerAuth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('/employee')
@Controller('department')
export class DepartmentController {
  constructor(private readonly departmentService: DepartmentService) { }

  @Post('/add-department')
  async create(@Body() createDepartmentDto: CreateDepartmentDto) {
    return this.departmentService.addDepartment(createDepartmentDto);
  }

  @Get('/get-all-departments')
  async findAll() {
    return this.departmentService.getAllDepartment();
  }

  @Patch('/update-department')
  async update(
    @Body() updateDepartmentDto: UpdateDepartmentDto) {
    return this.departmentService.updateDepartment(updateDepartmentDto);
  }

  @Delete('/delete-department')
  @ApiBody({
    schema: {
      type: 'object', properties: {
        guid: { type: 'string' }
      }
    }
  })
  async remove(@Body('guid') guid: string) {
    return this.departmentService.deleteDepartment(guid);
  }
}
