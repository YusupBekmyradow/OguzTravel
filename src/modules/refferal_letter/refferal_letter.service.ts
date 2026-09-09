import { Injectable } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
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
import { Op } from 'sequelize';

@Injectable()
export class RefferalLetterService {
  constructor(
    @InjectModel(RefferalLetter) private refferalLetterRepo: typeof RefferalLetter,
    @InjectModel(Client) private clientRepository: typeof Client,
    private sequelize: Sequelize,
    private readonly i18n: I18nService,
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
      }, {
        model: Client,
        as: 'client',
        attributes: ['guid', 'fullName', 'passport_number', 'dateOfBirth', 'gender', 'passport_count', 'passportHistory']
      }
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



  async addRefferalLetter(createDto: CreateRefferalLetterDto, lang: string) {
    const transaction = await this.sequelize.transaction();
    try {
      const client = await this.clientRepository.findByPk(createDto.client_guid, { transaction });

      const refferalLetter = await this.refferalLetterRepo.create(
        {
          ...createDto,
          date_time: createDto.date_time ? new Date(createDto.date_time) : new Date(),
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
        return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('refferal_letter.notFound', { lang }));
      }
      const formattedData = this.formatRefferalLetterPassport(newRefferalLetter);
      return {
        status: 201,
        data: formattedData,
        message: this.i18n.t('refferal_letter.created', { lang }),
      };
    } catch (error: any) {
      await transaction.rollback();
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('refferal_letter.createFailed', { lang }), error);
    }
  }




  async getAllRefferalLetter(
    page: number = 1,
    limit: number = 10,
    filters?: {
      search?: string;
      received_opr_guid?: string;
      departure_date?: string | Date;
      return_date?: string | Date;
      contract_date?: string | Date;
      start_date?: string | Date;
      end_date?: string | Date;
      status?: string;
    },
    lang: string = 'tk',
  ) {
    try {
      const currentPage = Math.max(1, Number(page));
      const currentLimit = Math.max(1, Number(limit));
      const offset = (currentPage - 1) * currentLimit;
      const whereConditions: any = {};
      if (filters) {
        if (filters.search && filters.search.trim() !== '') {
          const searchPattern = `%${filters.search.trim()}%`;
          const searchLower = filters.search.trim().toLowerCase();
          whereConditions[Op.or] = [
            { destination_country: { [Op.iLike]: searchPattern } },
            { tranzit: { [Op.iLike]: searchPattern } },
            { travel_document_number: { [Op.iLike]: searchPattern } },
            { contract_number: { [Op.iLike]: searchPattern } },
            { status: { [Op.iLike]: searchPattern } },
            this.sequelize.where(
              this.sequelize.fn('LOWER', this.sequelize.literal(`"RefferalLetter"."agent"->>'name'`)),
              { [Op.like]: `%${searchLower}%` }
            ),
            { '$client.fullName$': { [Op.iLike]: searchPattern } },
          ];
        }

        if (filters.received_opr_guid) {
          whereConditions.received_opr_guid = filters.received_opr_guid;
        }
        if (filters.departure_date) {
          const dateStr = new Date(filters.departure_date).toISOString().split('T')[0];
          const startDate = new Date(`${dateStr}T00:00:00.000Z`);
          const endDate = new Date(`${dateStr}T23:59:59.999Z`);
          whereConditions.departure_date = {
            [Op.between]: [startDate, endDate],
          };
        }

        if (filters.return_date) {
          const dateStr = new Date(filters.return_date).toISOString().split('T')[0];
          const startDate = new Date(`${dateStr}T00:00:00.000Z`);
          const endDate = new Date(`${dateStr}T23:59:59.999Z`);
          whereConditions.return_date = {
            [Op.between]: [startDate, endDate],
          };
        }

        if (filters.contract_date) {
          const dateStr = new Date(filters.contract_date).toISOString().split('T')[0];
          const startDate = new Date(`${dateStr}T00:00:00.000Z`);
          const endDate = new Date(`${dateStr}T23:59:59.999Z`);
          whereConditions.contract_date = {
            [Op.between]: [startDate, endDate],
          };
        }

        if (filters.start_date && filters.end_date) {
          const startDate = new Date(filters.start_date);
          const endDate = new Date(filters.end_date);
          if (typeof filters.start_date === 'string' && filters.start_date.length === 10) {
            startDate.setUTCHours(0, 0, 0, 0);
          }
          if (typeof filters.end_date === 'string' && filters.end_date.length === 10) {
            endDate.setUTCHours(23, 59, 59, 999);
          }
          whereConditions.date_time = {
            [Op.between]: [startDate, endDate],
          };
        } else if (filters.start_date) {
          const startDate = new Date(filters.start_date);
          if (typeof filters.start_date === 'string' && filters.start_date.length === 10) {
            startDate.setUTCHours(0, 0, 0, 0);
          }
          whereConditions.date_time = {
            [Op.gte]: startDate,
          };
        } else if (filters.end_date) {
          const endDate = new Date(filters.end_date);
          if (typeof filters.end_date === 'string' && filters.end_date.length === 10) {
            endDate.setUTCHours(23, 59, 59, 999);
          }
          whereConditions.date_time = {
            [Op.lte]: endDate,
          };
        }

        if (filters.status !== undefined && filters.status !== null && String(filters.status).trim() !== '') {
          whereConditions.status = filters.status;
        }
      }
      const { rows, count } = await this.refferalLetterRepo.findAndCountAll({
        where: whereConditions,
        include: this.getRefferalLetterIncludes(),
        order: [['index_number', 'DESC']],
        limit: Number(limit),
        offset: Number(offset),
        distinct: true
      });
      const formattedRows = rows.map(row => this.formatRefferalLetterPassport(row));
      return {
        status: 200,
        data: formattedRows,
        meta: {
          totalItems: count,
          totalPages: Math.ceil(count / limit),
          currentPage: currentPage,
          subQuery: false
        },
        message: this.i18n.t('refferal_letter.listFetched', { lang }),
      };
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('refferal_letter.fetchFailed', { lang }), error);
    }
  }



  async updateRefferalLetter(updateDto: UpdateRefferalLetterDto, lang: string) {
    const transaction = await this.sequelize.transaction();
    try {
      const existingLetter = await this.refferalLetterRepo.findByPk(updateDto.guid, { transaction });
      if (!existingLetter) {
        await transaction.rollback();
        return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('refferal_letter.notFound', { lang }));
      }
      let updateData: any = { ...updateDto };
      if (updateDto.client_guid && updateDto.client_guid !== existingLetter.client_guid) {
        const client = await this.clientRepository.findByPk(updateDto.client_guid, { transaction });
        if (client) {
          updateData.passport_count = client.passport_count || 1;
        }
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
        message: this.i18n.t('refferal_letter.updated', { lang }),
      };
    } catch (error: any) {
      await transaction.rollback();
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('refferal_letter.updateFailed', { lang }), error);
    }
  }



  async deleteRefferalLetter(guid: string, lang: string) {
    try {
      const refferalLetter = await this.refferalLetterRepo.findByPk(guid);
      if (!refferalLetter) {
        return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('refferal_letter.notFound', { lang }));
      }
      await refferalLetter.destroy();

      return successResponse(HttpStatuses.OK, null, this.i18n.t('refferal_letter.deleted', { lang }));
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('refferal_letter.deleteFailed', { lang }), error)
    }
  }
}






