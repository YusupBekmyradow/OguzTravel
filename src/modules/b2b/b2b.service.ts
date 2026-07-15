import { Injectable } from '@nestjs/common';
import { CreateB2bDto } from './dto/create-b2b.dto';
import { UpdateB2bDto } from './dto/update-b2b.dto';
import { InjectModel } from '@nestjs/sequelize';
import { B2b } from './entities/b2b.entity';
import { errorResponse, successResponse } from '../../helpers/responseFunctions';
import { HttpStatuses } from '../../helpers/httpStatuses.enum';
import { Employee } from '../employee/entities/employee.entity';
import { Client } from '../client/entities/client.entity';
import { Tstatus } from '../tstatus/entities/tstatus.entity';
import { Office } from '../office/entities/office.entity';

@Injectable()
export class B2bService {
  constructor(
    @InjectModel(B2b) private b2bRepository: typeof B2b
  ) { }

  private getB2bIncludes() {
    return [
      {
        model: Employee, as: 'assignment_operator', attributes: ['guid', 'fullName'],
        include: [{ model: Office, attributes: ['guid', 'fullName', 'shortName'] }]
      },
      {
        model: Employee, as: 'receiver_operator', attributes: ['guid', 'fullName'],
        include: [{ model: Office, attributes: ['guid', 'fullName', 'shortName'] }]
      },
      { model: Client, attributes: ['guid', 'fullName', 'passport_number', 'passportCountryOfIssue'] },
      { model: Tstatus, attributes: ['guid', 'name'] }
    ];
  }

  async addB2b(createB2bDto: CreateB2bDto) {
    try {
      const b2b = await this.b2bRepository.create({
        ...createB2bDto,
        profit: Number(createB2bDto.sale_price) - Number(createB2bDto.net_price)
      } as any);
      const newB2b = await this.b2bRepository.findOne({
        where: { guid: b2b.guid },
        include: this.getB2bIncludes()
      });
      if (!newB2b) {
        return errorResponse(HttpStatuses.NOT_FOUND, 'B2b not found')
      }
      return {
        status: 201,
        data: newB2b,
        message: 'B2b created successfully'
      }
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'B2b creation failes', error)
    }
  }


  async getAllB2b(page: number = 1, limit: number = 10) {
    try {
      const currentPage = Math.max(1, Number(page));
      const currentLimit = Math.max(1, Number(limit));
      const offset = (currentPage - 1) * currentLimit;

      const { rows, count } = await this.b2bRepository.findAndCountAll({
        include: this.getB2bIncludes(),
        order: [['index_number', 'DESC']],
        limit: Number(limit),
        offset: Number(offset),
      });

      return {
        status: 200,
        data: rows,
        meta: {
          totalItems: count,
          totalPages: Math.ceil(count / limit),
          currentPage: currentPage
        },
        message: 'B2b fetched successfully'
      };
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'B2b fetching error', error);
    }
  }


  async updateB2b(updateDto: UpdateB2bDto) {
    try {
      const [affectedCount] = await this.b2bRepository.update(updateDto, {
        where: { guid: updateDto.guid }
      });
      if (affectedCount === 0) return errorResponse(HttpStatuses.NOT_FOUND, 'B2b not found');

      const newB2b = await this.b2bRepository.findOne({
        where: { guid: updateDto.guid },
        include: this.getB2bIncludes()
      });
      return {
        status: 200,
        data: newB2b,
        message: 'B2b updated successfully'
      };
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Update failed', error)
    }
  }


  async deleteB2b(guid: string) {
    try {
      const b2b = await this.b2bRepository.findByPk(guid);
      if (!b2b) {
        return errorResponse(HttpStatuses.NOT_FOUND, 'B2b not found');
      }
      await b2b.destroy();

      return successResponse(HttpStatuses.OK, null, 'B2b deleted successfully');
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Deletion failed', error)
    }
  }
}