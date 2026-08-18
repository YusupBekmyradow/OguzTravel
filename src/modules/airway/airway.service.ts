import { Injectable } from '@nestjs/common';
import { CreateAirwayDto } from './dto/create-airway.dto';
import { UpdateAirwayDto } from './dto/update-airway.dto';
import { InjectModel } from '@nestjs/sequelize';
import { Airway } from './entities/airway.entity';
import { Employee } from '../employee/entities/employee.entity';
import { Client } from '../client/entities/client.entity';
import { errorResponse, successResponse } from '../../helpers/responseFunctions';
import { HttpStatuses } from '../../helpers/httpStatuses.enum';
import { Office } from '../office/entities/office.entity';
import { Sequelize } from 'sequelize-typescript';
import { HarPayment } from '../har_payment/entities/har_payment.entity';
import { I18nService } from 'nestjs-i18n';
import { QueryTypes } from 'sequelize';

@Injectable()
export class AirwayService {
  constructor(
    @InjectModel(Airway) private airwayRepository: typeof Airway,
    @InjectModel(HarPayment) private harPaymentRepo: typeof HarPayment,
    private sequelize: Sequelize,
    private readonly i18n: I18nService,
  ) { }

  private getIncludes() {
    return [
      { model: Employee, as: 'operator', attributes: ['guid', 'fullName'], include: [{ model: Office, attributes: ['guid', 'fullName', 'shortName'] }] },
      { model: Client, attributes: ['guid', 'fullName'] },
      { model: Employee, as: 'preparedOpr', attributes: ['guid', 'fullName'], include: [{ model: Office, attributes: ['guid', 'fullName', 'shortName'] }] },
    ];
  }

  private getAttributes() {
    return {
      include: [
        [Sequelize.literal(`(SELECT ROUND(COALESCE(SUM(amount), 0)::numeric, 2) FROM "tbl_HAR_payments" AS hp WHERE hp.airway_guid = "Airway"."guid")`), 'totalPaid'],
        [Sequelize.literal(`(SELECT CASE WHEN SUM(hp.amount) IS NULL OR SUM(hp.amount) = 0 THEN '0%' WHEN "Airway".price > 0 THEN CONCAT(ROUND(((SUM(hp.amount) / "Airway".price) * 100)::numeric, 2), '%') ELSE '100%' END FROM "tbl_HAR_payments" AS hp WHERE hp.airway_guid = "Airway"."guid")`), 'paidPercentage']
      ]
    };
  }

  async addAirway(createDto: CreateAirwayDto, lang: string) {
    const t = await this.sequelize.transaction();
    try {
      const airway = await this.airwayRepository.create({ ...createDto } as any, { hooks: true, transaction: t });
      if (createDto.is_paid === true) {
        await this.harPaymentRepo.create({ airway_guid: airway.guid, amount: airway.price || 0, payment_date: new Date(), opr_guid: createDto.opr_guid } as any, { transaction: t });
      }
      await t.commit();
      const newAirway = await this.airwayRepository.findOne({ where: { guid: airway.guid }, attributes: { exclude: ['opr_guid', 'client_guid', 'prepared_opr_guid'], include: this.getAttributes().include as any }, include: this.getIncludes() });
      return { status: 201, data: newAirway, message: this.i18n.t('airway.created', { lang }) };
    } catch (error: any) {
      await t.rollback();
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('airway.createFailed', { lang }), error);
    }
  }



  async getAllAirway(
    page: number = 1,
    limit: number = 10,
    search?: string,
    application_date?: string,
    opr_guid?: string,
    prepared_opr_guid?: string,
    is_paid?: boolean,
    system?: string,
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
        ticket_type: ticket_type || null,
      };

      const sqlQuery = `
      SELECT 
        a.guid, a.index_number, a.application_date, a.ticket_number, 
        a.ticket_type, a.destination_country, a.route, a.passenger_count, 
        a.net_fare, a.currency, a.price, a.profit, a.system, a.note, 
        a.is_paid, a."createdAt", a."updatedAt",

        ROUND(COALESCE(SUM(hp.amount), 0)::numeric, 2) AS "totalPaid",
        CASE 
          WHEN COALESCE(SUM(hp.amount), 0) = 0 THEN '0%' 
          WHEN a.price > 0 THEN CONCAT(ROUND(((SUM(hp.amount) / a.price) * 100)::numeric, 2), '%') 
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

      FROM tbl_airway a
      LEFT JOIN tbl_clients c ON c.guid = a.client_guid
      LEFT JOIN tbl_employees op ON op.guid = a.opr_guid
      LEFT JOIN tbl_offices off1 ON off1.guid = op.office_guid
      LEFT JOIN tbl_employees pop ON pop.guid = a.prepared_opr_guid
      LEFT JOIN tbl_offices off2 ON off2.guid = pop.office_guid
      LEFT JOIN "tbl_HAR_payments" hp ON hp.airway_guid = a.guid

      WHERE 

        (:search::text IS NULL OR (
          c."fullName" ILIKE :search OR
          a.ticket_number ILIKE :search OR
          a.destination_country ILIKE :search OR
          a.route ILIKE :search OR
          a.passenger_count::text ILIKE :search
        ))


        AND (:application_date::date IS NULL OR a.application_date::date = :application_date::date)
        AND (:opr_guid::uuid IS NULL OR a.opr_guid = :opr_guid::uuid)
        AND (:prepared_opr_guid::uuid IS NULL OR a.prepared_opr_guid = :prepared_opr_guid::uuid)
        AND (:is_paid::boolean IS NULL OR a.is_paid = :is_paid::boolean)
        AND (:system::text IS NULL OR a.system = :system::text)
        AND (:ticket_type::text IS NULL OR a.ticket_type = :ticket_type::text)

      GROUP BY a.guid, c.guid, op.guid, off1.guid, pop.guid, off2.guid
      ORDER BY a.index_number DESC
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
        message: this.i18n.t('airway.listFetched', { lang }),
      };
    } catch (error: any) {
      return errorResponse(
        HttpStatuses.INTERNAL_SERVER_ERROR,
        this.i18n.t('airway.fetchFailed', { lang }),
        error,
      );
    }
  }




  async updateAirway(updateDto: UpdateAirwayDto, lang: string) {
    try {
      const airway = await this.airwayRepository.findOne({ where: { guid: updateDto.guid } });
      if (!airway) return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('airway.notFound', { lang }));
      await airway.update(updateDto);
      const updatedAirway = await this.airwayRepository.findOne({ where: { guid: updateDto.guid }, attributes: { exclude: ['opr_guid', 'client_guid', 'prepared_opr_guid'], include: this.getAttributes().include as any }, include: this.getIncludes() });
      return { status: 200, data: updatedAirway, message: this.i18n.t('airway.updated', { lang }) };
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('airway.updateFailed', { lang }), error);
    }
  }

  async deleteAirway(guid: string, lang: string) {
    try {
      const airway = await this.airwayRepository.findByPk(guid);
      if (!airway) return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('airway.notFound', { lang }));
      await airway.destroy();
      return successResponse(HttpStatuses.OK, null, this.i18n.t('airway.deleted', { lang }));
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('airway.deleteFailed', { lang }), error);
    }
  }
}
