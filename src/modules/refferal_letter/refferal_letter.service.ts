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
import { CreateOtherLetterDto } from './dto/sub_report.dto';
import { UpdateOtherLetterDto } from './dto/sub_report_update.dto';

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

  private getRefferalLetterAttributes() {
    return [
      'guid',
      'index_number',
      'application_number',
      'received_opr_guid',
      'client_guid',
      'passport_count',
      'destination_country',
      'bgn_departure',
      'travel_document_number',
      'departure_date',
      'return_date',
      'price',
      'currency',
      'contract_number',
      'contract_date',
      'note',
      'status',
      'isRefferal',
      'createdAt',
      'updatedAt',
    ];
  }


  async addRefferalLetter(createDto: CreateRefferalLetterDto, lang: string) {
    const transaction = await this.sequelize.transaction();
    try {
      const rangeCheck = await this.checkOtherLetterRange(
        {
          isOne: true,
          travel_document_number: createDto.travel_document_number,
        },
        lang,
        undefined,
        transaction,
      );

      if ('error' in rangeCheck) {
        await transaction.rollback();
        return rangeCheck.error;
      }

      const client = await this.clientRepository.findByPk(createDto.client_guid, {
        attributes: ['guid', 'passport_count'],
        transaction
      });

      const refferalLetter = await this.refferalLetterRepo.create(
        {
          ...createDto,
          isRefferal: true,
          isOne: true,
          total_letter: 1,
          passport_count: client ? (client.passport_count || 1) : 1,
        } as any,
        { transaction }
      );
      await transaction.commit();
      const newRefferalLetter = await this.refferalLetterRepo.findOne({
        where: { guid: refferalLetter.guid },
        attributes: this.getRefferalLetterAttributes(),
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
      const whereConditions: any = { isRefferal: true };
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

        const startDep = filters.start_departure_date?.trim();
        const endDep = filters.end_departure_date?.trim();
        if (startDep && endDep) {
          whereConditions.departure_date = { [Op.between]: [new Date(`${startDep}T00:00:00.000Z`), new Date(`${endDep}T23:59:59.999Z`)] };
        } else if (startDep) {
          whereConditions.departure_date = { [Op.gte]: new Date(`${startDep}T00:00:00.000Z`) };
        } else if (endDep) {
          whereConditions.departure_date = { [Op.lte]: new Date(`${endDep}T23:59:59.999Z`) };
        }

        const startRet = filters.start_return_date?.trim();
        const endRet = filters.end_return_date?.trim();
        if (startRet && endRet) {
          whereConditions.return_date = { [Op.between]: [new Date(`${startRet}T00:00:00.000Z`), new Date(`${endRet}T23:59:59.999Z`)] };
        } else if (startRet) {
          whereConditions.return_date = { [Op.gte]: new Date(`${startRet}T00:00:00.000Z`) };
        } else if (endRet) {
          whereConditions.return_date = { [Op.lte]: new Date(`${endRet}T23:59:59.999Z`) };
        }


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
        attributes: this.getRefferalLetterAttributes(),
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
      const existingLetter = await this.refferalLetterRepo.findByPk(updateDto.guid, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!existingLetter) {
        await transaction.rollback();
        return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('refferal_letter.notFound', { lang }));
      }
      const targetDocNumber = updateDto.travel_document_number ?? existingLetter.travel_document_number;
      if (targetDocNumber) {
        const rangeCheck = await this.checkOtherLetterRange(
          {
            isOne: true,
            travel_document_number: targetDocNumber,
          },
          lang,
          existingLetter.guid,
          transaction,
        );
        if ('error' in rangeCheck) {
          await transaction.rollback();
          return rangeCheck.error;
        }
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

      const newRefferalLetter = await this.refferalLetterRepo.findOne({
        where: { guid: updateDto.guid },
        attributes: this.getRefferalLetterAttributes(),
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
















  private getOtherLetterAttributes() {
    return [
      'guid',
      'index_number',
      'isOne',
      'travel_document_number',
      'travel_document_number1',
      'total_letter',
      'date_time',
      'status',
      'received_opr_guid',
      'accepted_by',
      'note',
      'isRefferal',
      'createdAt',
      'updatedAt',
    ];
  }

  async addOtherLetter(createDto: CreateOtherLetterDto, lang: string) {
    const transaction = await this.sequelize.transaction();
    try {
      const range = await this.checkOtherLetterRange(createDto, lang, undefined, transaction);
      if ('error' in range) {
        await transaction.rollback();
        return range.error;
      }

      const letter = await this.refferalLetterRepo.create(
        {
          ...createDto,
          isOne: range.isOne,
          travel_document_number1: range.endNumber,
          total_letter: range.end - range.start + 1,
          isRefferal: false,
        } as any,
        { transaction }
      );
      await transaction.commit();

      const newLetter = await this.refferalLetterRepo.findOne({
        where: { guid: letter.guid },
        attributes: this.getOtherLetterAttributes(),
        include: [
          {
            model: Employee,
            as: 'refferaloperator',
            attributes: ['guid', 'fullName'],
          },
        ],
      });

      if (!newLetter) {
        return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('refferal_letter.notFound', { lang }));
      }
      return {
        status: 201,
        data: newLetter,
        message: this.i18n.t('refferal_letter.created', { lang }),
      };
    } catch (error: any) {
      await transaction.rollback();
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('refferal_letter.createFailed', { lang }), error);
    }
  }

  async getAllOtherLetters(
    page: number = 1,
    limit: number = 10,
    filters?: {
      search?: string;
      received_opr_guid?: string;
      start_date_time?: string;
      end_date_time?: string;
      status?: string;
    },
    lang: string = 'tk',
  ) {
    try {
      const currentPage = Math.max(1, Number(page));
      const currentLimit = Math.max(1, Number(limit));
      const offset = (currentPage - 1) * currentLimit;
      const whereConditions: any = { isRefferal: false };

      if (filters) {
        if (filters.search && filters.search.trim() !== '') {
          const searchPattern = `%${filters.search.trim()}%`;
          whereConditions[Op.or] = [
            { travel_document_number: { [Op.iLike]: searchPattern } },
            { travel_document_number1: { [Op.iLike]: searchPattern } },
            { status: { [Op.iLike]: searchPattern } },
            { accepted_by: { [Op.iLike]: searchPattern } },
          ];
        }

        if (filters.received_opr_guid) {
          whereConditions.received_opr_guid = filters.received_opr_guid;
        }

        const startDt = filters.start_date_time?.trim();
        const endDt = filters.end_date_time?.trim();
        if (startDt && endDt) {
          whereConditions.date_time = { [Op.between]: [new Date(`${startDt}T00:00:00.000Z`), new Date(`${endDt}T23:59:59.999Z`)] };
        } else if (startDt) {
          whereConditions.date_time = { [Op.gte]: new Date(`${startDt}T00:00:00.000Z`) };
        } else if (endDt) {
          whereConditions.date_time = { [Op.lte]: new Date(`${endDt}T23:59:59.999Z`) };
        }

        if (filters.status !== undefined && filters.status !== null && String(filters.status).trim() !== '') {
          whereConditions.status = filters.status;
        }
      }

      const { rows, count } = await this.refferalLetterRepo.findAndCountAll({
        where: whereConditions,
        attributes: this.getOtherLetterAttributes(),
        include: [
          {
            model: Employee,
            as: 'refferaloperator',
            attributes: ['guid', 'fullName'],
          },
        ],
        order: [['index_number', 'DESC']],
        limit: currentLimit,
        offset: Number(offset),
        distinct: true,
      });

      return {
        status: 200,
        data: rows,
        meta: {
          totalItems: count,
          totalPages: Math.ceil(count / currentLimit),
          currentPage: currentPage,
        },
        message: this.i18n.t('refferal_letter.listFetched', { lang }),
      };
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('refferal_letter.fetchFailed', { lang }), error);
    }
  }


  async updateOtherLetter(updateDto: UpdateOtherLetterDto, lang: string) {
    const transaction = await this.sequelize.transaction();
    try {
      const existingLetter = await this.refferalLetterRepo.findOne({
        where: { guid: updateDto.guid, isRefferal: false },
        transaction,
      });
      if (!existingLetter) {
        await transaction.rollback();
        return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('refferal_letter.notFound', { lang }));
      }

      const range = await this.checkOtherLetterRange(
        {
          isOne: updateDto.isOne ?? existingLetter.isOne,
          travel_document_number: updateDto.travel_document_number ?? existingLetter.travel_document_number,
          travel_document_number1: updateDto.travel_document_number1 ?? existingLetter.travel_document_number1,
        },
        lang,
        existingLetter.guid,
        transaction,
      );
      if ('error' in range) {
        await transaction.rollback();
        return range.error;
      }

      await existingLetter.update(
        {
          ...updateDto,
          isOne: range.isOne,
          travel_document_number1: range.endNumber,
          total_letter: range.end - range.start + 1,
        },
        { transaction },
      );
      await transaction.commit();

      const newLetter = await this.refferalLetterRepo.findOne({
        where: { guid: updateDto.guid },
        attributes: this.getOtherLetterAttributes(),
        include: [
          {
            model: Employee,
            as: 'refferaloperator',
            attributes: ['guid', 'fullName'],
          },
        ],
      });

      return {
        status: 200,
        data: newLetter,
        message: this.i18n.t('refferal_letter.updated', { lang }),
      };
    } catch (error: any) {
      await transaction.rollback();
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('refferal_letter.updateFailed', { lang }), error);
    }
  }

  async deleteOtherLetter(guid: string, lang: string) {
    try {
      const deleted = await this.refferalLetterRepo.destroy({ where: { guid, isRefferal: false } });
      if (!deleted) {
        return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('refferal_letter.notFound', { lang }));
      }
      return successResponse(HttpStatuses.OK, null, this.i18n.t('refferal_letter.deleted', { lang }));
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('refferal_letter.deleteFailed', { lang }), error);
    }
  }







  private documentRangeOverlap(start: number, end: number) {
    const col = (name: string) => `"RefferalLetter"."${name}"`;
    const num = (name: string) => `(CASE WHEN ${col(name)} ~ '^[0-9]+$' THEN ${col(name)}::bigint END)`;
    const rangeEnd = `COALESCE(CASE WHEN ${col('isRefferal')} IS NOT TRUE AND ${col('isOne')} IS NOT TRUE THEN ${num('travel_document_number1')} END, ${num('travel_document_number')})`;
    return this.sequelize.literal(`(${num('travel_document_number')} <= ${end} AND ${rangeEnd} >= ${start})`);
  }



  private async checkOtherLetterRange(
    data: { isOne?: boolean; travel_document_number?: string; travel_document_number1?: string },
    lang: string,
    ignoreGuid?: string,
    transaction?: any,
  ) {
    const isDigits = (value?: string) => typeof value === 'string' && /^[0-9]+$/.test(value);
    const hasEnd = !data.isOne && data.travel_document_number1 != null && data.travel_document_number1 !== '';

    if (!isDigits(data.travel_document_number) || (hasEnd && !isDigits(data.travel_document_number1))) {
      return { error: errorResponse(HttpStatuses.BAD_REQUEST, this.i18n.t('refferal_letter.invalidRange', { lang })) };
    }

    const start = Number(data.travel_document_number);
    const end = hasEnd ? Number(data.travel_document_number1) : start;

    if (end < start) {
      return { error: errorResponse(HttpStatuses.BAD_REQUEST, this.i18n.t('refferal_letter.invalidRange', { lang })) };
    }

    const conditions: any[] = [this.documentRangeOverlap(start, end)];
    if (ignoreGuid) conditions.push({ guid: { [Op.ne]: ignoreGuid } });
    const overlapping = await this.refferalLetterRepo.findOne({
      where: { [Op.and]: conditions },
      attributes: ['travel_document_number', 'travel_document_number1', 'isOne', 'isRefferal'],
      transaction,
      lock: transaction ? transaction.LOCK.UPDATE : false,
    });

    if (overlapping) {
      const oStart = overlapping.travel_document_number;
      const oEnd = !overlapping.isRefferal && !overlapping.isOne && overlapping.travel_document_number1
        ? overlapping.travel_document_number1
        : oStart;
      return {
        error: errorResponse(
          HttpStatuses.CONFLICT,
          this.i18n.t('refferal_letter.rangeOverlap', { lang, args: { start: oStart, end: oEnd } }),
        ),
      };
    }
    const isOne = start === end;
    return { start, end, isOne, endNumber: isOne ? '' : (data.travel_document_number1 as string) };
  }





  private stripIrrelevantFields(row: any) {
    const json = row.toJSON ? row.toJSON() : row;

    const refferalOnlyFields = [
      'application_number',
      'client_guid',
      'passport_count',
      'destination_country',
      'bgn_departure',
      'departure_date',
      'return_date',
      'price',
      'currency',
      'contract_number',
      'contract_date',
    ];

    const otherOnlyFields = [
      'isOne',
      'travel_document_number1',
      'total_letter',
      'date_time',
      'accepted_by',
    ];

    if (json.isRefferal) {
      otherOnlyFields.forEach(field => delete json[field]);
    } else {
      refferalOnlyFields.forEach(field => delete json[field]);
    }

    return json;
  }





  async getLettersByDocumentNumberRange(
    start_number: number,
    end_number: number,
    page: number = 1,
    limit: number = 10,
    lang: string = 'tk',
  ) {
    try {
      const currentPage = Math.max(1, Number(page));
      const currentLimit = Math.max(1, Number(limit));
      const offset = (currentPage - 1) * currentLimit;

      const start = Number(start_number);
      const end = Number(end_number);
      if (!Number.isInteger(start) || !Number.isInteger(end) || end < start) {
        return errorResponse(HttpStatuses.BAD_REQUEST, this.i18n.t('refferal_letter.invalidRange', { lang }));
      }

      const whereConditions: any = { [Op.and]: [this.documentRangeOverlap(start, end)] };
      const { rows, count } = await this.refferalLetterRepo.findAndCountAll({
        where: whereConditions,
        include: [
          {
            model: Employee,
            as: 'refferaloperator',
            attributes: ['guid', 'fullName'],
          },
        ],
        order: [['index_number', 'DESC']],
        limit: currentLimit,
        offset: Number(offset),
        distinct: true,
      });
      const allMatchingRows = await this.refferalLetterRepo.findAll({
        where: whereConditions,
        attributes: ['isRefferal', 'total_letter'],
      });

      let total_sum = 0;
      allMatchingRows.forEach((row: any) => {
        if (row.isRefferal) {
          total_sum += 1;
        } else {
          total_sum += row.total_letter || 0;
        }
      });

      const formattedRows = rows.map(row => this.stripIrrelevantFields(row));

      return {
        status: 200,
        data: formattedRows,
        meta: {
          totalItems: count,
          totalPages: Math.ceil(count / currentLimit),
          currentPage: currentPage,
          total_sum,
        },
        message: this.i18n.t('refferal_letter.listFetched', { lang }),
      };
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('refferal_letter.fetchFailed', { lang }), error);
    }
  }
}






