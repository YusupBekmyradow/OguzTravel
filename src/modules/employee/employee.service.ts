import { Injectable } from '@nestjs/common';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { InjectModel } from '@nestjs/sequelize';
import { Employee } from './entities/employee.entity';
import { errorResponse, successResponse } from '../../helpers/responseFunctions';
import { HttpStatuses } from '../../helpers/httpStatuses.enum';
import { Office } from '../office/entities/office.entity';
import { Position } from '../position/entities/position.entity';
import { Department } from '../department/entities/department.entity';
import { Op } from 'sequelize';

@Injectable()
export class EmployeeService {
  constructor(
    @InjectModel(Employee) private employeeRepository: typeof Employee
  ) { }

  async addEmployee(createEmployeeDto: CreateEmployeeDto) {
    try {
      const employee = await this.employeeRepository.create({
        ...createEmployeeDto
      } as any);

      const newEmployee = await this.employeeRepository.findOne({
        where: { guid: employee.guid },
        include: [
          { model: Office, attributes: ['guid', 'fullName', 'shortName'] },
          { model: Position, attributes: ['guid', 'name'] },
          { model: Department, attributes: ['guid', 'name'] }
        ]
      });
      if (!newEmployee) {
        throw new Error('Employee not found after creation');
      }
      return {
        status: 201,
        data: newEmployee,
        message: 'Employee created successfully'
      };
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Employee creation failed', error)
    }
  }


  async getAllEmployee(
    page: number = 1,
    limit: number = 10,
    search?: string,
    filters?: { department_guid?: string, office_guid?: string, position_guid?: string }
  ) {
    try {
      const currentPage = Math.max(1, Number(page));
      const currentLimit = Math.max(1, Number(limit)); 

      const offset = (currentPage - 1) * currentLimit;

      const whereClause: any = {};
      if (filters?.department_guid) whereClause.department_guid = filters.department_guid;
      if (filters?.office_guid) whereClause.office_guid = filters.office_guid;
      if (filters?.position_guid) whereClause.position_guid = filters.position_guid;

      if (search) {
        const sanitizedSearch = search.trim();
        whereClause[Op.or] = [
          { fullName: { [Op.iLike]: `%${sanitizedSearch}%` } },
          { gmail: { [Op.iLike]: `%${sanitizedSearch}%` } },
        ];
      }
      const { count, rows } = await this.employeeRepository.findAndCountAll({
        where: whereClause,
        order: [['index_number', 'ASC']],
        limit: Number(limit),
        offset: Number(offset),
        include: [
          { model: Office, attributes: ['guid', 'fullName', 'shortName'] },
          { model: Position, attributes: ['guid', 'name'] },
          { model: Department, attributes: ['guid', 'name'] }
        ]
      });
      return {
        status: 200,
        data: rows,
        meta: {
          totalItems: count,
          totalPages: Math.ceil(count / limit),
          currentPage: currentPage
        },
        message: 'Employees fetched successfully'
      };
    } catch (error) {
      console.log(error)
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Employees fetching error', error);
    }
  }



  async updateEmployee(updateEmployeeDto: UpdateEmployeeDto) {
    try {
      const employee = await this.employeeRepository.findByPk(updateEmployeeDto.guid);
      if (!employee) {
        return errorResponse(HttpStatuses.NOT_FOUND, 'Employee not found');
      }
      await employee.update({
        ...updateEmployeeDto
      } as any);

      const updateEmployee = await this.employeeRepository.findOne({
        where: { guid: employee.guid },
        include: [
          { model: Office, attributes: ['guid', 'fullName', 'shortName'] },
          { model: Position, attributes: ['guid', 'name'] },
          { model: Department, attributes: ['guid', 'name'] }
        ]
      });

      return {
        status: 200,
        data: updateEmployee,
        message: 'Employee updated successfully'
      };
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Update failed', error);
    }
  }


  async deleteEmployee(guid: string) {
    try {
      const employee = await this.employeeRepository.findByPk(guid);
      if (!employee) {
        return errorResponse(HttpStatuses.NOT_FOUND, 'Employee not found');
      }
      await employee.destroy();
      return successResponse(HttpStatuses.OK, null, 'Employee deleted successfully');
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Deletion failed', error);
    }
  }
}
