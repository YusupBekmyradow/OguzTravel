import { Injectable } from '@nestjs/common';
import { CreateRefferalLetterDto } from './dto/create-refferal_letter.dto';
import { UpdateRefferalLetterDto } from './dto/update-refferal_letter.dto';
import { Employee } from '../employee/entities/employee.entity';
import { Client } from '../client/entities/client.entity';
import { InjectModel } from '@nestjs/sequelize';
import { RefferalLetter } from './entities/refferal_letter.entity';
import { HttpStatuses } from '../../helpers/httpStatuses.enum';
import { errorResponse, successResponse } from '../../helpers/responseFunctions';
import { Office } from '../office/entities/office.entity';

@Injectable()
export class RefferalLetterService {
  constructor(
    @InjectModel(RefferalLetter) private refferalLetterRepo: typeof RefferalLetter
  ) { }

  private getRefferalLetterIncludes() {
    return [
      {
        model: Employee,
        as: 'refferaloperator',
        attributes: ['guid', 'fullName'],
        include: [
          {
            model: Office,
            attributes: ['guid', 'fullName', 'shortName']
          }
        ]
      }, { model: Client, attributes: ['guid', 'fullName', 'passport_number', 'dateOfBirth', 'gender'] }
    ];
  }

  async addRefferalLetter(createDto: CreateRefferalLetterDto) {
    try {
      const refferalLetter = await this.refferalLetterRepo.create({
        ...createDto,
      } as any);

      const newRefferalLetter = await this.refferalLetterRepo.findOne({
        where: { guid: refferalLetter.guid },
        include: this.getRefferalLetterIncludes()
      });
      if (!newRefferalLetter) {
        return errorResponse(HttpStatuses.NOT_FOUND, 'ReferenceLetter not found')
      }
      return {
        status: 201,
        data: newRefferalLetter,
        message: 'RefferalLetter created successfully'
      }
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'RefferalLetter creation failes', error)
    }
  }

  async getAllRefferalLetter(page: number = 1, limit: number = 10) {
    try {
      const currentPage = Math.max(1, Number(page));
      const currentLimit = Math.max(1, Number(limit));
      const offset = (currentPage - 1) * currentLimit;

      const { rows, count } = await this.refferalLetterRepo.findAndCountAll({
        include: this.getRefferalLetterIncludes(),
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
        message: 'RefferalLetter fetched successfully'
      };
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'RefferalLetter fetching error', error);
    }
  }

  async updateRefferalLetter(updateDto: UpdateRefferalLetterDto) {
    try {
      const [affectedCount] = await this.refferalLetterRepo.update(updateDto, {
        where: { guid: updateDto.guid }
      });
      if (affectedCount === 0) return errorResponse(HttpStatuses.NOT_FOUND, 'RefferalLetter not found');

      const newRefferalLetter = await this.refferalLetterRepo.findOne({
        where: { guid: updateDto.guid },
        include: this.getRefferalLetterIncludes()
      });
      return {
        status: 200,
        data: newRefferalLetter,
        message: 'RefferalLetter updated successfully'
      };
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Update failed', error)
    }
  }

  async deleteRefferalLetter(guid: string) {
    try {
      const refferalLetter = await this.refferalLetterRepo.findByPk(guid);
      if (!refferalLetter) {
        return errorResponse(HttpStatuses.NOT_FOUND, 'RefferalLetter not found');
      }
      await refferalLetter.destroy();

      return successResponse(HttpStatuses.OK, null, 'RefferalLetter deleted successfully');
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Deletion failed', error)
    }
  }
}
