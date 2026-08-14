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
import { Sequelize } from 'sequelize-typescript';
import { I18nService } from 'nestjs-i18n';
import { TicketPayment } from '../ticket_payment/entities/ticket_payment.entity';
import { Op } from 'sequelize';

@Injectable()
export class B2bService {
  constructor(
    @InjectModel(B2b) private b2bRepository: typeof B2b,
    @InjectModel(TicketPayment) private ticketPaymentRepo: typeof TicketPayment,
    @InjectModel(Client) private clientRepository: typeof Client,
    private sequelize: Sequelize,
    private readonly i18n: I18nService,
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
      { model: Client, attributes: ['guid', 'fullName', 'passport_number', 'passportCountryOfIssue', 'passport_count', 'passportHistory'] },
      { model: Tstatus, attributes: ['guid', 'name'] }
    ];
  }


  private getB2bAttributes() {
    return {
      include: [
        [
          Sequelize.literal(`(
          SELECT ROUND(COALESCE(SUM(amount), 0)::numeric, 2)
          FROM "tbl_ticket_payments" AS tp
          WHERE tp.b2b_guid = "B2b"."guid"
        )`),
          'totalPaid'
        ],
        [
          Sequelize.literal(`(
    SELECT 
      CASE 
        WHEN SUM(tp.amount) IS NULL OR SUM(tp.amount) = 0 THEN '0%'
        WHEN "B2b".sale_price > 0 
        THEN CONCAT(ROUND(((SUM(tp.amount) / "B2b".sale_price) * 100)::numeric, 2), '%')
        ELSE '100%' 
      END
    FROM "tbl_ticket_payments" AS tp
    WHERE tp.b2b_guid = "B2b"."guid"
  )`),
          'paidPercentage'
        ]
      ]
    };
  }


  private formatB2bPassport(b2bItem: any) {
    if (!b2bItem || !b2bItem.client) return b2bItem;
    const b2bJson = b2bItem.toJSON ? b2bItem.toJSON() : b2bItem;
    const client = b2bJson.client;

    if (b2bJson.passport_count && client.passport_count && b2bJson.passport_count !== client.passport_count) {
      if (Array.isArray(client.passportHistory)) {
        const oldPassport = client.passportHistory.find(
          (p: any) => p.passport_count === b2bJson.passport_count
        );
        if (oldPassport) {
          client.passport_number = oldPassport.passport_number;
          client.passportExpiryDate = oldPassport.passportExpiryDate;
          client.passportCountryOfIssue = oldPassport.passportCountryOfIssue;
        }
      }
    }
    delete client.passportHistory;
    return b2bJson;
  }


  async addB2b(createB2bDto: CreateB2bDto, lang: string) {
    const t = await this.sequelize.transaction();
    try {
      const client = await this.clientRepository.findByPk(createB2bDto.client_guid, { transaction: t });

      const b2b = await this.b2bRepository.create({
        ...createB2bDto,
        profit: Number(createB2bDto.sale_price) - Number(createB2bDto.net_price),
        passport_count: client ? (client.passport_count || 1) : 1
      } as any, { transaction: t });

      if (createB2bDto.is_paid === true) {
        await this.ticketPaymentRepo.create({
          b2b_guid: b2b.guid,
          amount: b2b.sale_price,
          payment_date: new Date(),
          opr_guid: createB2bDto.receiver_opr_guid
        } as any, { transaction: t });
      }
      await t.commit();
      const newB2b = await this.b2bRepository.findOne({
        where: { guid: b2b.guid },
        include: this.getB2bIncludes(),
        attributes: { include: this.getB2bAttributes().include as any }
      });

      if (!newB2b) {
        return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('b2b.notFound', { lang }))
      }

      const formattedData = this.formatB2bPassport(newB2b);
      return {
        status: 201,
        data: formattedData,
        message: this.i18n.t('b2b.created', { lang })
      }
    } catch (error: any) {
      await t.rollback();
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('b2b.createFailed', { lang }), error)
    }
  }


  async getAllB2b(
    page: number = 1,
    limit: number = 10,
    filters?: { datetime?: string | Date; assignment_opr_guid?: string; receiver_opr_guid?: string; status_guid?: string; travel_type?: number; flight_date?: string | Date; is_paid?: boolean; },
    lang: string = 'tk',
  ) {
    try {
      const currentPage = Math.max(1, Number(page));
      const currentLimit = Math.max(1, Number(limit));
      const offset = (currentPage - 1) * currentLimit;
      const whereConditions: any = {};

      if (filters) {
        if (filters.datetime) {
          const year = new Date(filters.datetime).getFullYear();
          if (!isNaN(year)) {
            const startDate = new Date(`${year}-01-01T00:00:00.000Z`);
            const endDate = new Date(`${year}-12-31T23:59:59.999Z`);
            whereConditions.datetime = {
              [Op.between]: [startDate, endDate],
            };
          }
        }
        if (filters.assignment_opr_guid) {
          whereConditions.assignment_opr_guid = filters.assignment_opr_guid;
        }
        if (filters.receiver_opr_guid) {
          whereConditions.receiver_opr_guid = filters.receiver_opr_guid;
        }
        if (filters.status_guid) {
          whereConditions.status_guid = filters.status_guid;
        }
        if (filters.travel_type !== undefined && filters.travel_type !== null) {
          whereConditions.travel_type = Number(filters.travel_type);
        }
        if (filters.flight_date) {
          whereConditions.flight_date = filters.flight_date;
        }
        if (filters.is_paid !== undefined && filters.is_paid !== null) {
          whereConditions.is_paid = filters.is_paid;
        }
      }
      const { rows, count } = await this.b2bRepository.findAndCountAll({
        where: whereConditions,
        include: this.getB2bIncludes(),
        attributes: { include: this.getB2bAttributes().include as any },
        order: [['index_number', 'DESC']],
        limit: Number(limit),
        offset: Number(offset),
        subQuery: false,
      });
      const formattedRows = rows.map(row => this.formatB2bPassport(row));

      return {
        status: 200,
        data: formattedRows,
        meta: {
          totalItems: count,
          totalPages: Math.ceil(count / limit),
          currentPage: currentPage,
        },
        message: this.i18n.t('b2b.listFetched', { lang }),
      };
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('b2b.fetchFailed', { lang }), error);
    }
  }



  async updateB2b(updateDto: UpdateB2bDto, lang: string) {
    const t = await this.sequelize.transaction();
    try {
      const existingB2b = await this.b2bRepository.findOne({
        where: { guid: updateDto.guid },
        transaction: t
      });
      if (!existingB2b) {
        await t.rollback();
        return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('b2b.notFound', { lang }));
      }
      let updateData: any = { ...updateDto };
      const targetClientGuid = updateDto.client_guid || existingB2b.client_guid;
      const client = await this.clientRepository.findByPk(targetClientGuid, { transaction: t });
      if (client) {
        updateData.passport_count = client.passport_count || 1;
      } else {
        updateData.passport_count = existingB2b.passport_count;
      }
      await existingB2b.update(updateData, { transaction: t });
      const updatedB2b = await this.b2bRepository.findOne({
        where: { guid: updateDto.guid },
        include: this.getB2bIncludes(),
        attributes: { include: this.getB2bAttributes().include as any },
        transaction: t
      });
      await t.commit();
      const formattedData = this.formatB2bPassport(updatedB2b);
      return { status: 200, data: formattedData, message: this.i18n.t('b2b.updated', { lang }) };
    } catch (error: any) {
      await t.rollback();
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('b2b.updateFailed', { lang }), error);
    }
  }


  async deleteB2b(guid: string, lang: string) {
    try {
      const b2b = await this.b2bRepository.findByPk(guid);
      if (!b2b) {
        return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('b2b.notFound', { lang }));
      }
      await b2b.destroy();

      return successResponse(HttpStatuses.OK, null, this.i18n.t('b2b.deleted', { lang }));
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('b2b.deleteFailed', { lang }), error)
    }
  }
}

