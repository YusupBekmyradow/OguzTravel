import { Injectable } from '@nestjs/common';
import { errorResponse, successResponse } from '../../helpers/responseFunctions';
import { InjectModel } from '@nestjs/sequelize';
import { User } from './entities/user.entity';
import { HttpStatuses } from '../../helpers/httpStatuses.enum';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Op } from 'sequelize';
import { Employee } from '../employee/entities/employee.entity';


@Injectable()
export class UserService {

  constructor(
    @InjectModel(User) private userRepository: typeof User,
    @InjectModel(Employee) private employeeRepository: typeof Employee
  ) { }

  async addUser(createUserDto: CreateUserDto) {
    try {
      let employeePhoneNumber: string | null = null;

      if (createUserDto.employee_guid) {
        const employee = await this.employeeRepository.findOne({
          where: { guid: createUserDto.employee_guid }
        });

        if (!employee) {
          return errorResponse(HttpStatuses.NOT_FOUND, 'Employee not found');
        }
        employeePhoneNumber = employee.phone_number;
      }

      const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

      const user = await this.userRepository.create({
        ...createUserDto,
        password: hashedPassword,
        phone_number: employeePhoneNumber
      } as any);

      const plainUser = user.get({ plain: true });

      const { password, refresh_token, ...userResponse } = plainUser;

      return successResponse(HttpStatuses.CREATED, userResponse, 'User created successfully');
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'User creation failed', error);
    }
  }



  async getAllUser(page: number = 1, limit: number = 10,
    search?: string,
    filters?: { isActive?: boolean; isExternalUser?: boolean }
  ) {
    try {
      const currentPage = Math.max(1, Number(page));
      const currentLimit = Math.max(1, Number(limit));
      const offset = (currentPage - 1) * currentLimit;

      const whereClause: any = {};
      if (filters?.isActive !== undefined) {
        whereClause.isActive = filters.isActive;
      }
      if (filters?.isExternalUser !== undefined) {
        whereClause.isExternalUser = filters.isExternalUser;
      }

      const employeeWhere: any = {};
      if (search) {
        employeeWhere.fullName = { [Op.iLike]: `%${search.trim()}%` };
      }

      const { count, rows } = await this.userRepository.findAndCountAll({
        where: whereClause,
        limit: currentLimit,
        offset: offset,
        order: [['createdAt', 'DESC']],
        include: [
          {
            model: Employee,
            where: Object.keys(employeeWhere).length > 0 ? employeeWhere : undefined,
            required: !!search
          }
        ]
      });
      const totalPages = Math.ceil(count / limit);

      const cleanedRows = rows.map(user => {
        const plainUser = user.get({ plain: true });
        const { password, refresh_token, ...userWithoutSensitiveData } = plainUser;
        return userWithoutSensitiveData;
      });
      return {
        status: 200,
        data: cleanedRows,
        meta: {
          totalItems: count,
          totalPages,
          currentPage: currentPage
        },
        message: 'Users fetched successfully'
      };
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Users fetching error', error);
    }
  }


  async updateUser(updateUserDto: UpdateUserDto) {
    try {
      const user = await this.userRepository.findByPk(updateUserDto.guid);
      if (!user) {
        return errorResponse(HttpStatuses.NOT_FOUND, 'User not found');
      }
      if (updateUserDto.password) {
        updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
      }
      await user.update(updateUserDto);
      await user.reload();
      const plainUser = user.get({ plain: true });
      const { password, refresh_token, ...userResponse } = plainUser;
      return successResponse(HttpStatuses.OK, userResponse, 'User updated successfully');
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Update failed', error);
    }
  }


  async deleteUser(guid: string) {
    try {
      const user = await this.userRepository.findByPk(guid);
      if (!user) {
        return errorResponse(HttpStatuses.NOT_FOUND, 'User not found');
      }
      await user.destroy();
      return successResponse(HttpStatuses.OK, null, 'User deleted successfully');
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Deletion failed', error);
    }
  }
}
