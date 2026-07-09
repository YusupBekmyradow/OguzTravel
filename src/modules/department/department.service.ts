import { Injectable } from '@nestjs/common';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { InjectModel } from '@nestjs/sequelize';
import { Department } from './entities/department.entity';
import { errorResponse, successResponse } from '../../helpers/responseFunctions';
import { HttpStatuses } from '../../helpers/httpStatuses.enum';

@Injectable()
export class DepartmentService {
  constructor(
    @InjectModel(Department) private departmentRepository: typeof Department,
  ) { }

    async addDepartment(createDepartmentDto: CreateDepartmentDto) {
      try {
        const department = await this.departmentRepository.create({
          ...createDepartmentDto
        } as any)
        return successResponse(HttpStatuses.CREATED, department, 'Department created successfully');
      } catch (error) {
        return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Department creation failed', error)
      }
    }

   async getAllDepartment() {
    try {
      const departments = await this.departmentRepository.findAll({order: [['createdAt', 'DESC']]});
      return successResponse(HttpStatuses.OK, departments, 'Departments fetched successfully');
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Departments fetched error')
    }
  }


 async updateDepartment(updateDepartmentDto: UpdateDepartmentDto) {
    try {
      const department = await this.departmentRepository.findOne({ where: { guid: updateDepartmentDto.guid } });
      if (!department) return errorResponse(HttpStatuses.NOT_FOUND, 'Department not found');

      await this.departmentRepository.update(updateDepartmentDto as any, { where: {guid: updateDepartmentDto.guid } });

      const updatedDepartment = await this.departmentRepository.findOne({ where: { guid: updateDepartmentDto.guid } });

      return successResponse(HttpStatuses.OK, updatedDepartment, 'Department updated successfully');
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Update error', error);
    }
  }


   async deleteDepartment(guid: string) {
    try {
      const deletedCount = await this.departmentRepository.destroy({
        where: { guid } 
      });

      if (deletedCount === 0) {
        return errorResponse(HttpStatuses.NOT_FOUND, 'Department not found');
      }

      return successResponse(HttpStatuses.OK,  null , 'Department deleted successfully');
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Delete error', error);
    }
  }
}
