import { Injectable, OnModuleInit } from '@nestjs/common';
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
export class RefferalLetterService implements OnModuleInit {
  constructor(
    @InjectModel(RefferalLetter) private refferalLetterRepo: typeof RefferalLetter,
    @InjectModel(Client) private clientRepository: typeof Client,
    private sequelize: Sequelize,
    private readonly i18n: I18nService,
  ) { }

  async onModuleInit() {
    try {
      // tranzit kolonunu bgn_departure olarak rename et (varsa)
      await this.sequelize.query(`
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'tbl_refferal_letter' AND column_name = 'tranzit'
          ) THEN
            ALTER TABLE "tbl_refferal_letter" RENAME COLUMN "tranzit" TO "bgn_departure";
          END IF;
          -- Eger bgn_departure yoksa ekle
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'tbl_refferal_letter' AND column_name = 'bgn_departure'
          ) THEN
            ALTER TABLE "tbl_refferal_letter" ADD COLUMN "bgn_departure" VARCHAR;
          END IF;
        END $$;
      `);
    } catch (e) {
      // ignore
    }
  }

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
      const client = await this.clientRepository.findByPk(createDto.client_guid, {
        attributes: ['guid', 'passport_count'],
        transaction
      });

      const refferalLetter = await this.refferalLetterRepo.create(
        {
          ...createDto,
          passport_count: client ? (client.passport_count || 1) : 1,
        } as any,
        { transaction }
      );
      await transaction.commit();

      // Transaction kapandiktan sonra fetch - daha hizli
      const newRefferalLetter = await this.refferalLetterRepo.findOne({
        where: { guid: refferalLetter.guid },
        include: this.getRefferalLetterIncludes(),
      });

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
      start_departure_date?: string;
      end_departure_date?: string;
      start_return_date?: string;
      end_return_date?: string;
      start_contract_date?: string;
      end_contract_date?: string;
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
            { bgn_departure: { [Op.iLike]: searchPattern } },
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

        // departure_date range filter
        const startDep = filters.start_departure_date?.trim();
        const endDep = filters.end_departure_date?.trim();
        if (startDep && endDep) {
          whereConditions.departure_date = { [Op.between]: [new Date(`${startDep}T00:00:00.000Z`), new Date(`${endDep}T23:59:59.999Z`)] };
        } else if (startDep) {
          whereConditions.departure_date = { [Op.gte]: new Date(`${startDep}T00:00:00.000Z`) };
        } else if (endDep) {
          whereConditions.departure_date = { [Op.lte]: new Date(`${endDep}T23:59:59.999Z`) };
        }

        // return_date range filter
        const startRet = filters.start_return_date?.trim();
        const endRet = filters.end_return_date?.trim();
        if (startRet && endRet) {
          whereConditions.return_date = { [Op.between]: [new Date(`${startRet}T00:00:00.000Z`), new Date(`${endRet}T23:59:59.999Z`)] };
        } else if (startRet) {
          whereConditions.return_date = { [Op.gte]: new Date(`${startRet}T00:00:00.000Z`) };
        } else if (endRet) {
          whereConditions.return_date = { [Op.lte]: new Date(`${endRet}T23:59:59.999Z`) };
        }

        // contract_date range filter
        const startCon = filters.start_contract_date?.trim();
        const endCon = filters.end_contract_date?.trim();
        if (startCon && endCon) {
          whereConditions.contract_date = { [Op.between]: [new Date(`${startCon}T00:00:00.000Z`), new Date(`${endCon}T23:59:59.999Z`)] };
        } else if (startCon) {
          whereConditions.contract_date = { [Op.gte]: new Date(`${startCon}T00:00:00.000Z`) };
        } else if (endCon) {
          whereConditions.contract_date = { [Op.lte]: new Date(`${endCon}T23:59:59.999Z`) };
        }

        if (filters.status !== undefined && filters.status !== null && String(filters.status).trim() !== '') {
          whereConditions.status = filters.status;
        }
      }
      const { rows, count } = await this.refferalLetterRepo.findAndCountAll({
        where: whereConditions,
        include: this.getRefferalLetterIncludes(),
        order: [['index_number', 'DESC']],
        limit: currentLimit,
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
        const client = await this.clientRepository.findByPk(updateDto.client_guid, {
          attributes: ['guid', 'passport_count'],
          transaction
        });
        if (client) {
          updateData.passport_count = client.passport_count || 1;
        }
      } else {
        updateData.passport_count = existingLetter.passport_count;
      }
      await existingLetter.update(updateData, { transaction });
      await transaction.commit();

      // Transaction kapandiktan sonra fetch - lock serbest kalir
      const newRefferalLetter = await this.refferalLetterRepo.findOne({
        where: { guid: updateDto.guid },
        include: this.getRefferalLetterIncludes(),
      });
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
      const deleted = await this.refferalLetterRepo.destroy({ where: { guid } });
      if (!deleted) {
        return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('refferal_letter.notFound', { lang }));
      }
      return successResponse(HttpStatuses.OK, null, this.i18n.t('refferal_letter.deleted', { lang }));
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('refferal_letter.deleteFailed', { lang }), error)
    }
  }
}






