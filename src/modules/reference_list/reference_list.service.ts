import { Injectable } from '@nestjs/common';
import { CreateReferenceListDto } from './dto/create-reference_list.dto';
import { UpdateReferenceListDto } from './dto/update-reference_list.dto';
import { InjectModel } from '@nestjs/sequelize';
import { ReferenceList } from './entities/reference_list.entity';
import { errorResponse, successResponse } from '../../helpers/responseFunctions';
import { HttpStatuses } from '../../helpers/httpStatuses.enum';
import { Office } from '../office/entities/office.entity';
import { Client } from '../client/entities/client.entity';
import { Employee } from '../employee/entities/employee.entity';

@Injectable()
export class ReferenceListService {
  constructor(
    @InjectModel(ReferenceList) private referenceListRepo: typeof ReferenceList
  ) { }

  private getReferenceListIncludes() {
    return [
      { model: Employee, as: 'referenceoperator', attributes: ['guid', 'fullName'] },
      { model: Office, attributes: ['guid', 'fullName', 'shortName'] },
      { model: Client, attributes: ['guid', 'fullName', 'passport_number', 'dateOfBirth', 'gender'] }
    ];
  }

  async addReferenceList(createReferenceListDto: CreateReferenceListDto) {
    try {
      const referenceList = await this.referenceListRepo.create({
        ...createReferenceListDto,
      } as any);

      const newReferenceList = await this.referenceListRepo.findOne({
        where: { guid: referenceList.guid },
        include: this.getReferenceListIncludes()
      });
      if (!newReferenceList) {
        return errorResponse(HttpStatuses.NOT_FOUND, 'ReferenceList not found')
      }
      return {
        status: 201,
        data: newReferenceList,
        message: 'ReferenceList created successfully'
      }
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'ReferenceList creation failes', error)
    }
  }

  async getAllReferenceList(page: number = 1, limit: number = 10) {
    try {
      const currentPage = Math.max(1, Number(page));
      const currentLimit = Math.max(1, Number(limit));
      const offset = (currentPage - 1) * currentLimit;

      const { rows, count } = await this.referenceListRepo.findAndCountAll({
        include: this.getReferenceListIncludes(),
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
        message: 'ReferenceList fetched successfully'
      };
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'ReferenceList fetching error', error);
    }
  }

  async updateReferenceList(updateDto: UpdateReferenceListDto) {
    try {
      const [affectedCount] = await this.referenceListRepo.update(updateDto, {
        where: { guid: updateDto.guid }
      });
      if (affectedCount === 0) return errorResponse(HttpStatuses.NOT_FOUND, 'ReferenceList not found');

      const newReferenceList = await this.referenceListRepo.findOne({
        where: { guid: updateDto.guid },
        include: this.getReferenceListIncludes()
      });
      return {
        status: 200,
        data: newReferenceList,
        message: 'ReferenceList updated successfully'
      };
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Update failed', error)
    }
  }

  async deleteReferenceList(guid: string) {
    try {
      const referenceList = await this.referenceListRepo.findByPk(guid);
      if (!referenceList) {
        return errorResponse(HttpStatuses.NOT_FOUND, 'ReferenceList not found');
      }
      await referenceList.destroy();

      return successResponse(HttpStatuses.OK, null, 'ReferenceList deleted successfully');
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Deletion failed', error)
    }
  }
}
