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
import { Sequelize } from 'sequelize-typescript';

@Injectable()
export class RefferalLetterService {
  constructor(
    @InjectModel(RefferalLetter) private refferalLetterRepo: typeof RefferalLetter,
    @InjectModel(Client) private clientRepository: typeof Client,
    private sequelize: Sequelize
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
      }, { model: Client, attributes: ['guid', 'fullName', 'passport_number', 'dateOfBirth', 'gender', 'passport_count', 'passportHistory'] }
    ];
  }


  private formatRefferalLetterPassport(letter: any) {
    if (!letter || !letter.client) return letter;
    const letterJson = letter.toJSON ? letter.toJSON() : letter;
    const client = letterJson.client;

    if (letterJson.passport_count && client.passport_count && letterJson.passport_count !== client.passport_count) {
      if (Array.isArray(client.passportHistory)) {
        const oldPassport = client.passportHistory.find(
          (p: any) => p.passport_count === letterJson.passport_count
        );
        if (oldPassport) {
          client.passport_number = oldPassport.passport_number;
          client.passportExpiryDate = oldPassport.passportExpiryDate;
          client.passportCountryOfIssue = oldPassport.passportCountryOfIssue;
        }
      }
    }
    delete client.passportHistory;
    return letterJson;
  }



  async addRefferalLetter(createDto: CreateRefferalLetterDto) {
    const transaction = await this.sequelize.transaction();
    try {
      const client = await this.clientRepository.findByPk(createDto.client_guid, { transaction });

      const refferalLetter = await this.refferalLetterRepo.create(
        {
          ...createDto,
          passport_count: client ? (client.passport_count || 1) : 1,
        } as any,
        { transaction }
      );
      const newRefferalLetter = await this.refferalLetterRepo.findOne({
        where: { guid: refferalLetter.guid },
        include: this.getRefferalLetterIncludes(),
        transaction
      });
      await transaction.commit();

      if (!newRefferalLetter) {
        return errorResponse(HttpStatuses.NOT_FOUND, 'ReferenceLetter not found');
      }
      const formattedData = this.formatRefferalLetterPassport(newRefferalLetter);
      return {
        status: 201,
        data: formattedData,
        message: 'RefferalLetter created successfully'
      };
    } catch (error: any) {
      await transaction.rollback();
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'RefferalLetter creation failed', error);
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
      const formattedRows = rows.map(row => this.formatRefferalLetterPassport(row));

      return {
        status: 200,
        data: formattedRows,
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
    const transaction = await this.sequelize.transaction();
    try {
      const existingLetter = await this.refferalLetterRepo.findByPk(updateDto.guid, { transaction });
      if (!existingLetter) {
        await transaction.rollback();
        return errorResponse(HttpStatuses.NOT_FOUND, 'RefferalLetter not found');
      }
      let updateData: any = { ...updateDto };
      const targetClientGuid = updateDto.client_guid || existingLetter.client_guid;

      const client = await this.clientRepository.findByPk(targetClientGuid, { transaction });
      if (client) {
        updateData.passport_count = client.passport_count || 1;
      } else {
        updateData.passport_count = existingLetter.passport_count;
      }
      await existingLetter.update(updateData, { transaction });

      const newRefferalLetter = await this.refferalLetterRepo.findOne({
        where: { guid: updateDto.guid },
        include: this.getRefferalLetterIncludes(),
        transaction
      });
      await transaction.commit();
      const formattedData = this.formatRefferalLetterPassport(newRefferalLetter);
      return {
        status: 200,
        data: formattedData,
        message: 'RefferalLetter updated successfully'
      };
    } catch (error: any) {
      await transaction.rollback();
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Update failed', error);
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
