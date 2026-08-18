import { Injectable } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { CreateRailwayDto } from './dto/create-railway.dto';
import { UpdateRailwayDto } from './dto/update-railway.dto';
import { InjectModel } from '@nestjs/sequelize';
import { Railway } from './entities/railway.entity';
import { Employee } from '../employee/entities/employee.entity';
import { Office } from '../office/entities/office.entity';
import { Client } from '../client/entities/client.entity';
import { errorResponse, successResponse } from '../../helpers/responseFunctions';
import { HttpStatuses } from '../../helpers/httpStatuses.enum';
import { Sequelize } from 'sequelize-typescript';
import { HarPayment } from '../har_payment/entities/har_payment.entity';
import { QueryTypes } from 'sequelize';

@Injectable()
export class RailwayService {
  constructor(
    @InjectModel(Railway) private railwayRepository: typeof Railway,
    @InjectModel(HarPayment) private harPaymentRepo: typeof HarPayment,
    private sequelize: Sequelize,
    private readonly i18n: I18nService,
  ) { }

  private getIncludes() {
    return [
      {
        model: Employee, as: 'operator', attributes: ['guid', 'fullName'],
        include: [{ model: Office, attributes: ['guid', 'fullName', 'shortName'] }]
      },
      { model: Client, attributes: ['guid', 'fullName'] },
      {
        model: Employee, as: 'preparedOpr', attributes: ['guid', 'fullName'],
        include: [{ model: Office, attributes: ['guid', 'fullName', 'shortName'] }]
      },
    ];
  }

  private getAttributes() {
    return {
      include: [
        [
          Sequelize.literal(`(
            SELECT ROUND(COALESCE(SUM(amount), 0)::numeric, 2)
            FROM "tbl_HAR_payments" AS hp
            WHERE hp.railway_guid = "Railway"."guid"
          )`),
          'totalPaid'
        ],
        [
          Sequelize.literal(`(
            SELECT 
              CASE 
                WHEN SUM(hp.amount) IS NULL OR SUM(hp.amount) = 0 THEN '0%'
                WHEN "Railway".price > 0 
                THEN CONCAT(ROUND(((SUM(hp.amount) / "Railway".price) * 100)::numeric, 2), '%')
                ELSE '100%' 
              END
            FROM "tbl_HAR_payments" AS hp
            WHERE hp.railway_guid = "Railway"."guid"
          )`),
          'paidPercentage'
        ]
      ]
    };
  }

  async addRailway(createDto: CreateRailwayDto, lang: string) {
    const t = await this.sequelize.transaction();
    try {
      const railway = await this.railwayRepository.create({ ...createDto } as any, { hooks: true, transaction: t });
      if (createDto.is_paid === true) {
        await this.harPaymentRepo.create({
          railway_guid: railway.guid,
          amount: railway.price || 0,
          payment_date: new Date(),
          opr_guid: createDto.opr_guid
        } as any, { transaction: t });
      }
      await t.commit();

      const newRailway = await this.railwayRepository.findOne({
        where: { guid: railway.guid },
        attributes: {
          exclude: ['opr_guid', 'client_guid', 'prepared_opr_guid'],
          include: this.getAttributes().include as any
        },
        include: this.getIncludes()
      });

      return { status: 201, data: newRailway, message: 'Railway record has been created successfully' };
    } catch (error: any) {
      await t.rollback();
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Failed to create the railway record. Please try again later.', error);
    }
  }



  async getAllRailway(
    page: number = 1,
    limit: number = 10,
    search?: string,
    application_date?: string,
    opr_guid?: string,
    prepared_opr_guid?: string,
    is_paid?: boolean,
    system?: string,
    train_type?: string,
    ticket_type?: string,
    lang: string = 'tk',
  ) {
    try {
      const currentPage = Math.max(1, Number(page));
      const currentLimit = Math.max(1, Number(limit));
      const offset = (currentPage - 1) * currentLimit;

      const replacements: any = {
        limit: currentLimit,
        offset,
        search: search ? `%${search}%` : null,
        application_date: application_date || null,
        opr_guid: opr_guid || null,
        prepared_opr_guid: prepared_opr_guid || null,
        is_paid: is_paid !== undefined && is_paid !== null ? is_paid : null,
        system: system || null,
        train_type: train_type || null,
        ticket_type: ticket_type || null,
      };

      const sqlQuery = `
      SELECT 
        r.guid, r.index_number, r.application_date, r.ticket_number, 
        r.train_type, r.ticket_type, r.destination_country, r.route, 
        r.passenger_count, r.net_fare, r.currency, r.price, r.profit, 
        r.system, r.note, r.is_paid, r."createdAt", r."updatedAt",

        ROUND(COALESCE(SUM(hp.amount), 0)::numeric, 2) AS "totalPaid",
        CASE 
          WHEN COALESCE(SUM(hp.amount), 0) = 0 THEN '0%' 
          WHEN r.price > 0 THEN CONCAT(ROUND(((SUM(hp.amount) / r.price) * 100)::numeric, 2), '%') 
          ELSE '100%' 
        END AS "paidPercentage",

        JSON_BUILD_OBJECT('guid', c.guid, 'fullName', c."fullName") AS client,
        JSON_BUILD_OBJECT(
          'guid', op.guid, 'fullName', op."fullName",
          'office', JSON_BUILD_OBJECT('guid', off1.guid, 'fullName', off1."fullName", 'shortName', off1."shortName")
        ) AS operator,
        JSON_BUILD_OBJECT(
          'guid', pop.guid, 'fullName', pop."fullName",
          'office', JSON_BUILD_OBJECT('guid', off2.guid, 'fullName', off2."fullName", 'shortName', off2."shortName")
        ) AS "preparedOpr",

        COUNT(*) OVER() AS "totalCount"

      FROM tbl_railway r
      LEFT JOIN tbl_clients c ON c.guid = r.client_guid
      LEFT JOIN tbl_employees op ON op.guid = r.opr_guid
      LEFT JOIN tbl_offices off1 ON off1.guid = op.office_guid
      LEFT JOIN tbl_employees pop ON pop.guid = r.prepared_opr_guid
      LEFT JOIN tbl_offices off2 ON off2.guid = pop.office_guid
      LEFT JOIN "tbl_HAR_payments" hp ON hp.railway_guid = r.guid

      WHERE 

        (:search::text IS NULL OR (
          c."fullName" ILIKE :search OR
          r.ticket_number ILIKE :search OR
          r.destination_country ILIKE :search OR
          r.route ILIKE :search OR
          r.passenger_count::text ILIKE :search
        ))

        AND (:application_date::date IS NULL OR r.application_date::date = :application_date::date)
        AND (:opr_guid::uuid IS NULL OR r.opr_guid = :opr_guid::uuid)
        AND (:prepared_opr_guid::uuid IS NULL OR r.prepared_opr_guid = :prepared_opr_guid::uuid)
        AND (:is_paid::boolean IS NULL OR r.is_paid = :is_paid::boolean)
        AND (:system::text IS NULL OR r.system = :system::text)
        AND (:train_type::text IS NULL OR r.train_type = :train_type::text)
        AND (:ticket_type::text IS NULL OR r.ticket_type = :ticket_type::text)

      GROUP BY r.guid, c.guid, op.guid, off1.guid, pop.guid, off2.guid
      ORDER BY r.index_number DESC
      LIMIT :limit OFFSET :offset;
    `;

      const rows: any[] = await this.sequelize.query(sqlQuery, {
        replacements,
        type: QueryTypes.SELECT,
      });

      const totalItems = rows.length > 0 ? Number(rows[0].totalCount) : 0;
      const cleanedRows = rows.map(({ totalCount, ...rest }) => rest);

      return {
        status: 200,
        data: cleanedRows,
        meta: {
          totalItems,
          totalPages: Math.ceil(totalItems / currentLimit),
          currentPage,
        },
        message: this.i18n.t('railway.listFetched', { lang }),
      };
    } catch (error: any) {
      return errorResponse(
        HttpStatuses.INTERNAL_SERVER_ERROR,
        this.i18n.t('railway.fetchFailed', { lang }),
        error,
      );
    }
  }



  async updateRailway(updateDto: UpdateRailwayDto, lang: string) {
    try {
      const railway = await this.railwayRepository.findOne({
        where: { guid: updateDto.guid }
      });

      if (!railway) {
        return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('railway.notFound', { lang }));
      }
      await railway.update(updateDto);
      const updatedRailway = await this.railwayRepository.findOne({
        where: { guid: updateDto.guid },
        attributes: {
          exclude: ['opr_guid', 'client_guid', 'prepared_opr_guid'],
          include: this.getAttributes().include as any
        },
        include: this.getIncludes()
      });

      return { status: 200, data: updatedRailway, message: this.i18n.t('railway.updated', { lang }) };
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('railway.updateFailed', { lang }), error);
    }
  }


  async deleteRailway(guid: string, lang: string) {
    try {
      const railway = await this.railwayRepository.findByPk(guid);
      if (!railway) return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('railway.notFound', { lang }));
      await railway.destroy();
      return successResponse(HttpStatuses.OK, null, this.i18n.t('railway.deleted', { lang }));
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('railway.deleteFailed', { lang }), error);
    }
  }
}




