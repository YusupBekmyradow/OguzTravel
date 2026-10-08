import { Injectable, OnModuleInit } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { CreateRefferalLetterDto } from './dto/create-refferal_letter.dto';
import { UpdateRefferalLetterDto } from './dto/update-refferal_letter.dto';
import { Employee } from '../employee/entities/employee.entity';
import { Client } from '../client/entities/client.entity';
import { InjectModel } from '@nestjs/sequelize';
import { RefferalLetter } from './entities/refferal_letter.entity';
import { RefferalCountry } from '../refferal_country/entities/refferal_country.entity';
import { HttpStatuses } from '../../helpers/httpStatuses.enum';
import { errorResponse, successResponse } from '../../helpers/responseFunctions';
import { Office } from '../office/entities/office.entity';
import { Sequelize } from 'sequelize-typescript';
import { Op } from 'sequelize';
import { CreateOtherLetterDto } from './dto/sub_report.dto';
import { UpdateOtherLetterDto } from './dto/sub_report_update.dto';

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
/**
 * Letter dates are stored as the instant of local (Ashgabat) midnight, so a day picked in the
 * filter is compared with the local calendar day, not the UTC one.
 */
const localDay = (column: string) => `("RefferalLetter"."${column}" AT TIME ZONE 'Asia/Ashgabat')::date`;
/** A filter day that is a real YYYY-MM-DD date, or null: anything else is ignored. */
const validDay = (value?: string) => {
  const day = value?.trim().slice(0, 10);
  return day && DAY_RE.test(day) && !Number.isNaN(Date.parse(day)) ? day : null;
};
/** Typed text is matched literally: % and _ are not wildcards. */
const escapeLike = (value: string) => value.replace(/[\\%_]/g, '\\$&');

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
          -- BGN arrival, next to BGN departure
          ALTER TABLE "tbl_refferal_letter" ADD COLUMN IF NOT EXISTS "bgn_arrival" VARCHAR;
          -- Refferal country guid
          ALTER TABLE "tbl_refferal_letter" ADD COLUMN IF NOT EXISTS "refferal_country_guid" UUID;
          -- The country is picked from tbl_refferal_countries now. The old free-text column is
          -- dropped once no referral letter depends on it: letters that only have the text are
          -- first matched to a country by name, and the column stays if any is left unmatched.
          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'tbl_refferal_letter' AND column_name = 'destination_country'
          ) THEN
            ALTER TABLE "tbl_refferal_letter" ALTER COLUMN "destination_country" DROP NOT NULL;
            IF to_regclass('tbl_refferal_countries') IS NOT NULL THEN
              UPDATE "tbl_refferal_letter" l
              SET "refferal_country_guid" = c."guid"
              FROM "tbl_refferal_countries" c
              WHERE l."isRefferal" IS TRUE
                AND l."refferal_country_guid" IS NULL
                AND COALESCE(TRIM(l."destination_country"), '') <> ''
                AND LOWER(TRIM(l."destination_country")) IN (
                  LOWER(TRIM(c."name"->>'tk')), LOWER(TRIM(c."name"->>'ru')), LOWER(TRIM(c."name"->>'en'))
                );
            END IF;
            IF NOT EXISTS (
              SELECT 1 FROM "tbl_refferal_letter"
              WHERE "isRefferal" IS TRUE
                AND "refferal_country_guid" IS NULL
                AND COALESCE(TRIM("destination_country"), '') <> ''
            ) THEN
              ALTER TABLE "tbl_refferal_letter" DROP COLUMN "destination_country";
            ELSE
              RAISE WARNING 'tbl_refferal_letter.destination_country kept: some referral letters have a country text that matches no row of tbl_refferal_countries';
            END IF;
          END IF;
        END $$;
      `);
    } catch (e) {
      // Without these columns every list query fails, so make it visible.
      console.error('tbl_refferal_letter column migration failed:', e);
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
      },
      {
        model: RefferalCountry,
        as: 'refferalCountry',
        attributes: ['guid', 'name', 'index_number']
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
    delete letterJson.refferal_country_guid;
    return letterJson;
  }

  private getRefferalLetterAttributes() {
    return [
      'guid',
      'index_number',
      'received_opr_guid',
      'client_guid',
      'passport_count',
      'bgn_departure',
      'bgn_arrival',
      'travel_document_number',
      'departure_date',
      'return_date',
      'price',
      'currency',
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
      console.log(error)
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
      refferal_country_guid?: string;
    },
    lang: string = 'tk',
  ) {
    try {
      const currentPage = Math.max(1, Number(page));
      const currentLimit = Math.max(1, Math.min(500, Number(limit) || 10));
      const offset = (currentPage - 1) * currentLimit;
      const whereConditions: any = { isRefferal: true };
      if (filters) {
        if (filters.search && filters.search.trim() !== '') {
          const searchText = escapeLike(filters.search.trim());
          const searchPattern = `%${searchText}%`;
          const searchLower = searchText.toLowerCase();
          whereConditions[Op.or] = [
            { bgn_departure: { [Op.iLike]: searchPattern } },
            { bgn_arrival: { [Op.iLike]: searchPattern } },
            { travel_document_number: { [Op.iLike]: searchPattern } },
            { status: { [Op.iLike]: searchPattern } },
            this.sequelize.where(
              this.sequelize.fn('LOWER', this.sequelize.literal(`"RefferalLetter"."agent"->>'name'`)),
              { [Op.like]: `%${searchLower}%` }
            ),
            { '$client.fullName$': { [Op.iLike]: searchPattern } },
            ...['tk', 'ru', 'en'].map((l) =>
              this.sequelize.where(
                this.sequelize.literal(`"refferalCountry"."name"->>'${l}'`),
                { [Op.iLike]: searchPattern },
              ),
            ),
          ];
        }

        if (filters.received_opr_guid) {
          whereConditions.received_opr_guid = filters.received_opr_guid;
        }

        if (filters.refferal_country_guid) {
          whereConditions.refferal_country_guid = filters.refferal_country_guid;
        }

        // Both ends of a range are included; an end without a start (or the reverse) works alone.
        const dayConditions: any[] = [];
        const addDayRange = (column: string, start?: string, end?: string) => {
          const from = validDay(start);
          const to = validDay(end);
          if (from) dayConditions.push(this.sequelize.literal(`${localDay(column)} >= ${this.sequelize.escape(from)}`));
          if (to) dayConditions.push(this.sequelize.literal(`${localDay(column)} <= ${this.sequelize.escape(to)}`));
        };
        addDayRange('departure_date', filters.start_departure_date, filters.end_departure_date);
        addDayRange('return_date', filters.start_return_date, filters.end_return_date);
        addDayRange('contract_date', filters.start_contract_date, filters.end_contract_date);
        if (dayConditions.length) whereConditions[Op.and] = dayConditions;

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
          totalPages: Math.ceil(count / currentLimit),
          currentPage: currentPage,
          subQuery: false
        },
        message: this.i18n.t('refferal_letter.listFetched', { lang }),
      };
    } catch (error: any) {
      console.log(error)
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
      // Paged list: at most 500 rows per request (the Excel export asks for 500).
      const currentLimit = Math.max(1, Math.min(500, Number(limit) || 10));
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

        // Local (Ashgabat) calendar days, both included; either end works alone. With UTC day
        // bounds a letter dated between 00:00 and 05:00 local time fell on the day before.
        const startDt = validDay(filters.start_date_time);
        const endDt = validDay(filters.end_date_time);
        const dayConditions: any[] = [];
        if (startDt) dayConditions.push(this.sequelize.literal(`${localDay('date_time')} >= ${this.sequelize.escape(startDt)}`));
        if (endDt) dayConditions.push(this.sequelize.literal(`${localDay('date_time')} <= ${this.sequelize.escape(endDt)}`));
        if (dayConditions.length) whereConditions[Op.and] = dayConditions;

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
          {
            model: RefferalCountry,
            as: 'refferalCountry',
            attributes: ['guid', 'name', 'index_number'],
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
      'client_guid',
      'refferal_country_guid',
      'refferalCountry',
      'passport_count',
      'bgn_departure',
      'bgn_arrival',
      'departure_date',
      'return_date',
      'price',
      'currency',
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
          {
            model: RefferalCountry,
            as: 'refferalCountry',
            attributes: ['guid', 'name', 'index_number'],
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






