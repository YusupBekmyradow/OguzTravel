import { Injectable } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { CreateTourDto } from './dto/create-tour.dto';
import { UpdateTourDto } from './dto/update-tour.dto';
import { InjectModel } from '@nestjs/sequelize';
import { Tour } from './entities/tour.entity';
import { Employee } from '../employee/entities/employee.entity';
import { Office } from '../office/entities/office.entity';
import { Client } from '../client/entities/client.entity';
import { errorResponse, successResponse } from '../../helpers/responseFunctions';
import { HttpStatuses } from '../../helpers/httpStatuses.enum';
import { Sequelize } from 'sequelize-typescript';
import { TtpPayment } from '../ttp_payment/entities/ttp_payment.entity';
import { QueryTypes } from 'sequelize';

@Injectable()
export class TourService {
  constructor(
    @InjectModel(Tour) private tourRepository: typeof Tour,
    @InjectModel(TtpPayment) private ttpPaymentRepo: typeof TtpPayment,
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
            FROM "tbl_TTP_payments" AS tp
            WHERE tp.tour_guid = "Tour"."guid"
          )`),
          'totalPaid'
        ],
        [
          Sequelize.literal(`(
            SELECT 
              CASE 
                WHEN SUM(tp.amount) IS NULL OR SUM(tp.amount) = 0 THEN '0%'
                WHEN "Tour".price > 0 
                THEN CONCAT(ROUND(((SUM(tp.amount) / "Tour".price) * 100)::numeric, 2), '%')
                ELSE '100%' 
              END
            FROM "tbl_TTP_payments" AS tp
            WHERE tp.tour_guid = "Tour"."guid"
          )`),
          'paidPercentage'
        ]
      ]
    };
  }

  async addTour(createDto: CreateTourDto, lang: string) {
    const t = await this.sequelize.transaction();
    try {
      const tour = await this.tourRepository.create({ ...createDto } as any, { hooks: true, transaction: t });
      if (createDto.is_paid === true) {
        await this.ttpPaymentRepo.create({
          tour_guid: tour.guid,
          amount: tour.price || 0,
          payment_date: new Date(),
          opr_guid: createDto.opr_guid
        } as any, { transaction: t });
      }

      await t.commit();

      const newTour = await this.tourRepository.findOne({
        where: { guid: tour.guid },
        attributes: {
          exclude: ['opr_guid', 'client_guid', 'prepared_opr_guid'],
          include: this.getAttributes().include as any
        },
        include: this.getIncludes()
      });
      return { status: 201, data: newTour, message: this.i18n.t('tour.created', { lang }) };
    } catch (error: any) {
      await t.rollback();
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('tour.createFailed', { lang }), error);
    }
  }

  async getAllTour(
    page: number = 1,
    limit: number = 10,
    search?: string,
    application_date?: string,
    opr_guid?: string,
    prepared_opr_guid?: string,
    is_paid?: boolean,
    system?: string,
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
      };

      const sqlQuery = `
        SELECT 
          t.guid, t.index_number, t.application_date, t.destination_country, 
          t.tour_name, t.guests_count, t.net_fare, t.currency, t.price, 
          t.profit, t.system, t.note, t.is_paid, t."createdAt", t."updatedAt",

          ROUND(COALESCE(SUM(tp.amount), 0)::numeric, 2) AS "totalPaid",
          CASE 
            WHEN COALESCE(SUM(tp.amount), 0) = 0 THEN '0%' 
            WHEN t.price > 0 THEN CONCAT(ROUND(((SUM(tp.amount) / t.price) * 100)::numeric, 2), '%') 
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

        FROM tbl_tour t
        LEFT JOIN tbl_clients c ON c.guid = t.client_guid
        LEFT JOIN tbl_employees op ON op.guid = t.opr_guid
        LEFT JOIN tbl_offices off1 ON off1.guid = op.office_guid
        LEFT JOIN tbl_employees pop ON pop.guid = t.prepared_opr_guid
        LEFT JOIN tbl_offices off2 ON off2.guid = pop.office_guid
        LEFT JOIN "tbl_TTP_payments" tp ON tp.tour_guid = t.guid

        WHERE 
          (:search::text IS NULL OR (
            c."fullName" ILIKE :search OR
            t.destination_country ILIKE :search OR
            t.tour_name ILIKE :search OR
            t.guests_count::text ILIKE :search
          ))

          AND (:application_date::date IS NULL OR t.application_date::date = :application_date::date)
          AND (:opr_guid::uuid IS NULL OR t.opr_guid = :opr_guid::uuid)
          AND (:prepared_opr_guid::uuid IS NULL OR t.prepared_opr_guid = :prepared_opr_guid::uuid)
          AND (:is_paid::boolean IS NULL OR t.is_paid = :is_paid::boolean)
          AND (:system::text IS NULL OR t.system = :system::text)

        GROUP BY t.guid, c.guid, op.guid, off1.guid, pop.guid, off2.guid
        ORDER BY t.index_number DESC
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
        message: this.i18n.t('tour.listFetched', { lang }),
      };
    } catch (error: any) {
      return errorResponse(
        HttpStatuses.INTERNAL_SERVER_ERROR,
        this.i18n.t('tour.fetchFailed', { lang }),
        error,
      );
    }
  }



  async updateTour(updateDto: UpdateTourDto, lang: string) {
    try {
      const tour = await this.tourRepository.findOne({
        where: { guid: updateDto.guid }
      });

      if (!tour) {
        return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('tour.notFound', { lang }));
      }
      await tour.update(updateDto);
      const updatedTour = await this.tourRepository.findOne({
        where: { guid: updateDto.guid },
        attributes: {
          exclude: ['opr_guid', 'client_guid', 'prepared_opr_guid'],
          include: this.getAttributes().include as any
        },
        include: this.getIncludes()
      });

      return { status: 200, data: updatedTour, message: this.i18n.t('tour.updated', { lang }) };
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('tour.updateFailed', { lang }), error);
    }
  }

  async deleteTour(guid: string, lang: string) {
    try {
      const tour = await this.tourRepository.findByPk(guid);
      if (!tour) return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('tour.notFound', { lang }));
      await tour.destroy();
      return successResponse(HttpStatuses.OK, null, this.i18n.t('tour.deleted', { lang }));
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('tour.deleteFailed', { lang }), error);
    }
  }
}

