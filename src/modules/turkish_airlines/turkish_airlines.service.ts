import { Injectable, OnModuleInit } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { CreateTurkishAirlineDto } from './dto/create-turkish_airline.dto';
import { UpdateTurkishAirlineDto } from './dto/update-turkish_airline.dto';
import { InjectModel } from '@nestjs/sequelize';
import { TurkishAirline } from './entities/turkish_airline.entity';
import { errorResponse, successResponse } from '../../helpers/responseFunctions';
import { HttpStatuses } from '../../helpers/httpStatuses.enum';
import { Employee } from '../employee/entities/employee.entity';
import { Office } from '../office/entities/office.entity';
import { Client } from '../client/entities/client.entity';
import { Tstatus } from '../tstatus/entities/tstatus.entity';
import { Sequelize } from 'sequelize-typescript';
import { Op, QueryTypes } from 'sequelize';

import { TurkishPayment } from '../turkish_payment/entities/turkish_payment.entity';

interface FooterRow {
  office: string;
  total_base: number | string;
  total_quoted: number | string;
  profit?: number;
  percentage?: string;
}


@Injectable()
export class TurkishAirlinesService implements OnModuleInit {
  constructor(
    @InjectModel(TurkishAirline) private turkishAirlineRepo: typeof TurkishAirline,
    @InjectModel(TurkishPayment) private turkishPaymentRepo: typeof TurkishPayment,
    @InjectModel(Client) private clientRepository: typeof Client,
    private sequelize: Sequelize,
    private readonly i18n: I18nService,
  ) { }

  async onModuleInit() {
    try {
      await this.sequelize.query(`
        ALTER TABLE "tbl_turkish_airlines"
        ALTER COLUMN "pnr" DROP NOT NULL,
        ALTER COLUMN "route" DROP NOT NULL,
        ALTER COLUMN "class" DROP NOT NULL,
        ALTER COLUMN "accepted_price" DROP NOT NULL,
        ALTER COLUMN "returned_price" DROP NOT NULL;
      `);
    } catch (e) { }
  }

  async getTurkishReport(yearMonth: string, lang: string = 'tk') {
    try {
      const [year, month] = yearMonth.split('-').map(Number);
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

      const reportQuery = `
      WITH date_series AS (
          SELECT generate_series(:startDate::date, :endDate::date, '1 day'::interval)::date AS flight_date
      ),
      raw_data AS (
          SELECT 
              d.flight_date,
              o.guid AS office_guid,
              o."fullName" AS full_name,
              o."shortName" AS shortName,
              COALESCE(SUM(t.base_fare), 0) AS base_fare,
              COALESCE(SUM(t.quoted_price), 0) AS quoted_price
          FROM tbl_offices AS o
          CROSS JOIN date_series AS d
          LEFT JOIN tbl_turkish_airlines AS t ON t.office_guid = o.guid AND DATE(t.datetime) = d.flight_date
          GROUP BY d.flight_date, o.guid, o."fullName", o."shortName"
      )
      SELECT 
        (SELECT json_agg(r) FROM (SELECT TO_CHAR(flight_date, 'DD') AS datetime, office_guid, full_name, shortname, base_fare AS base_fare_sum, quoted_price AS quoted_price_sum FROM raw_data ORDER BY flight_date, shortname) r) AS data,
        
        (SELECT json_agg(d) FROM (SELECT TO_CHAR(flight_date, 'DD') AS datetime, SUM(base_fare) AS daily_total_base, SUM(quoted_price) AS daily_total_quoted FROM raw_data GROUP BY flight_date ORDER BY flight_date) d) AS "dailyTotals",
        
        (SELECT json_agg(f) FROM (
            SELECT 
                office_guid,
                full_name,
                shortName,
                SUM(base_fare) AS total_base, 
                SUM(quoted_price) AS total_quoted,
                (SUM(quoted_price) - SUM(base_fare)) AS profit
            FROM raw_data 
          GROUP BY office_guid, full_name, shortName
        ) f) AS footer,
        
        (SELECT json_build_object(
            'month_total_base', SUM(base_fare),
            'month_total_quoted', SUM(quoted_price),
            'month_profit', SUM(quoted_price - base_fare),
            'working_days_count', COUNT(DISTINCT flight_date) FILTER (WHERE base_fare > 0 OR quoted_price > 0)
        ) FROM raw_data) AS "grandTotal"
    `;

      const [result] = await this.sequelize.query(reportQuery, {
        replacements: { startDate, endDate },
        type: QueryTypes.SELECT
      });

      const footerWithPercent = (result as any).footer.map((item: any) => ({
        ...item,
        percentage: (result as any).grandTotal.month_profit !== 0
          ? ((Number(item.profit) / (result as any).grandTotal.month_profit) * 100).toFixed(2) + '%'
          : '0.00%'
      }));
      return {
        status: 200,
        data: (result as any).data || [],
        dailyTotals: (result as any).dailyTotals || [],
        footer: footerWithPercent,
        grandTotal: (result as any).grandTotal,
        message: this.i18n.t('turkish_airlines.monthlyReport', { lang })
      };
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('turkish_airlines.monthlyReportFailed', { lang }), error);
    }
  }



  private getTurkishAirlineIncludes() {
    return [
      {
        model: Employee, as: 'ta_assignment_operator', attributes: ['guid', 'fullName'],
        include: [{ model: Office, attributes: ['guid', 'fullName', 'shortName'] }]
      },
      {
        model: Employee, as: 'ta_receiver_operator', attributes: ['guid', 'fullName'],
        include: [{ model: Office, attributes: ['guid', 'fullName', 'shortName'] }]
      },
      { model: Client },
      { model: Tstatus, attributes: ['guid', 'name'] },
      { model: Office, attributes: ['guid', 'fullName', 'shortName'] }
    ];
  }


  private getTurkishAttributes() {
    return [
      [
        Sequelize.literal(`(
        SELECT ROUND(COALESCE(SUM(tp.amount), 0)::numeric, 2)
        FROM "tbl_turkish_payments" AS tp
        WHERE tp.turkish_airline_guid = "TurkishAirline"."guid"
      )`),
        'totalPaid'
      ],
      [
        Sequelize.literal(`(
        SELECT 
          CASE 
            WHEN SUM(tp.amount) IS NULL OR SUM(tp.amount) = 0 THEN '0%'
            WHEN "TurkishAirline".quoted_price > 0 
            THEN CONCAT(ROUND(((SUM(tp.amount) / "TurkishAirline".quoted_price) * 100)::numeric, 2), '%')
            ELSE '100%'
          END
        FROM "tbl_turkish_payments" AS tp
        WHERE tp.turkish_airline_guid = "TurkishAirline"."guid"
      )`),
        'paidPercentage'
      ],
      [
        Sequelize.literal(`(
        SELECT ROUND(
          GREATEST(
            COALESCE("TurkishAirline".total_price, 0) - COALESCE(SUM(tp.amount), 0),
            0
          )::numeric, 2
        )
        FROM "tbl_turkish_payments" AS tp
        WHERE tp.turkish_airline_guid = "TurkishAirline"."guid"
      )`),
        'credit_price'
      ]
    ];
  }


  async addTurkishAirline(createTurkishAirlineDto: CreateTurkishAirlineDto, lang: string) {
    const t = await this.sequelize.transaction();
    try {
      const client = await this.clientRepository.findByPk(createTurkishAirlineDto.client_guid, { transaction: t });

      const turkishAirline = await this.turkishAirlineRepo.create(
        {
          ...createTurkishAirlineDto,
          passport_count: client ? (client.passport_count || 1) : 1
        } as any,
        { hooks: true, transaction: t }
      );

      const isResetStatus = createTurkishAirlineDto.status_guid === '22f0d634-5798-4e5b-9d2b-34b94ec36fbf';
      const isPaidTrue = createTurkishAirlineDto.is_paid === true || (createTurkishAirlineDto.is_paid as any) === 'true';
      const targetPrice = createTurkishAirlineDto.total_price !== undefined
        ? Math.round(Number(createTurkishAirlineDto.total_price))
        : (Number(turkishAirline.quoted_price) || Math.round(Number(turkishAirline.total_price)) || 0);

      if ((isPaidTrue || isResetStatus) && targetPrice > 0) {
        await this.turkishPaymentRepo.create({
          turkish_airline_guid: turkishAirline.guid,
          amount: targetPrice,
          payment_date: new Date(),
          opr_guid: createTurkishAirlineDto.receiver_opr_guid || createTurkishAirlineDto.assignment_opr_guid
        } as any, { transaction: t });
      }

      await t.commit();

      const newTurkishAirline = await this.turkishAirlineRepo.findOne({
        where: { guid: turkishAirline.guid },
        include: this.getTurkishAirlineIncludes(),
        attributes: { include: this.getTurkishAttributes() as any }
      });

      if (!newTurkishAirline) {
        return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('turkish_airlines.notFound', { lang }));
      }
      return {
        status: 201,
        data: newTurkishAirline,
        message: this.i18n.t('turkish_airlines.created', { lang })
      };
    } catch (error: any) {
      await t.rollback();
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('turkish_airlines.createFailed', { lang }), error);
    }
  }


  private formatTurkishAirlinePassport(airline: any) {
    if (!airline || !airline.client) return airline;
    const airlineJson = airline.toJSON ? airline.toJSON() : airline;
    const client = airlineJson.client;
    if (airlineJson.passport_count && client.passport_count && airlineJson.passport_count !== client.passport_count) {
      if (Array.isArray(client.passportHistory)) {
        const oldPassport = client.passportHistory.find(
          (p: any) => p.passport_count === airlineJson.passport_count
        );
        if (oldPassport) {
          client.passport_number = oldPassport.passport_number;
          client.passportExpiryDate = oldPassport.passportExpiryDate;
          client.passportCountryOfIssue = oldPassport.passportCountryOfIssue;
        }
      }
    }
    delete client.passportHistory;
    return airlineJson;
  }


  /**
   * start_date / end_date as local (Ashgabat) calendar days, both included. Tickets are stored
   * as instants, so comparing them with UTC day bounds put the first five hours of a local day
   * on the day before. A bare year ("2026") still means the whole year.
   */
  private localDayRange(column: string, start?: string | Date, end?: string | Date) {
    const toDay = (value: string | Date | undefined, yearEdge: string) => {
      if (typeof value !== 'string') return null;
      const trimmed = value.trim();
      if (/^\d{4}$/.test(trimmed)) return `${trimmed}-${yearEdge}`;
      const day = trimmed.slice(0, 10);
      return /^\d{4}-\d{2}-\d{2}$/.test(day) && !Number.isNaN(Date.parse(day)) ? day : null;
    };
    const localDay = `(${column} AT TIME ZONE 'Asia/Ashgabat')::date`;
    const conditions: any[] = [];
    const from = toDay(start, '01-01');
    const to = toDay(end, '12-31');
    if (from) conditions.push(this.sequelize.literal(`${localDay} >= ${this.sequelize.escape(from)}`));
    if (to) conditions.push(this.sequelize.literal(`${localDay} <= ${this.sequelize.escape(to)}`));
    return conditions;
  }

  async getAllTurkishAirline(page: number = 1, limit: number = 10,
    filters: { search?: string; start_date?: string | Date; end_date?: string | Date; assignment_opr_guid?: string; receiver_opr_guid?: string; status_guid?: string; flight_date?: string; is_paid?: boolean | string; office_guid?: string; } = {},
    lang: string = 'tk',
  ) {
    try {
      const currentPage = Math.max(1, Number(page));
      const currentLimit = Math.max(1, Number(limit));
      const offset = (currentPage - 1) * currentLimit;

      const whereCondition: any = {};
      if (filters.search && filters.search.trim() !== '') {
        const searchPattern = `%${filters.search.trim()}%`;
        const searchLower = filters.search.trim().toLowerCase();
        whereCondition[Op.or] = [
          { milesSmiles: { [Op.iLike]: searchPattern } },
          { pnr: { [Op.iLike]: searchPattern } },
          { ticket_number: { [Op.iLike]: searchPattern } },
          { route: { [Op.iLike]: searchPattern } },
          { class: { [Op.iLike]: searchPattern } },
          this.sequelize.where(
            this.sequelize.fn('LOWER', this.sequelize.literal(`"TurkishAirline"."agent"->>'name'`)),
            { [Op.like]: `%${searchLower}%` }
          ),
          { '$client.fullName$': { [Op.iLike]: searchPattern } },
        ];
      }
      const dayRange = this.localDayRange('"TurkishAirline"."datetime"', filters.start_date, filters.end_date);
      if (dayRange.length) whereCondition[Op.and] = dayRange;
      if (filters.assignment_opr_guid) {
        whereCondition.assignment_opr_guid = filters.assignment_opr_guid;
      }
      if (filters.receiver_opr_guid) {
        whereCondition.receiver_opr_guid = filters.receiver_opr_guid;
      }
      if (filters.status_guid) {
        whereCondition.status_guid = filters.status_guid;
      }
      if (filters.flight_date) {
        const dateOnly = filters.flight_date.includes('T')
          ? filters.flight_date.split('T')[0]
          : filters.flight_date.trim();
        whereCondition.flight_date = dateOnly;
      }
      if (filters.is_paid !== undefined && filters.is_paid !== '') {
        whereCondition.is_paid = String(filters.is_paid) === 'true' || filters.is_paid === true;
      }
      if (filters.office_guid) {
        whereCondition.office_guid = filters.office_guid;
      }
      const { rows, count } = await this.turkishAirlineRepo.findAndCountAll({
        where: whereCondition,
        include: this.getTurkishAirlineIncludes(),
        attributes: { include: this.getTurkishAttributes() as any },
        order: [['index_number', 'DESC']],
        limit: Number(limit),
        offset: Number(offset),
        subQuery: false
      });
      const formattedRows = rows.map(row => this.formatTurkishAirlinePassport(row));
      return {
        status: 200,
        data: formattedRows,
        meta: {
          totalItems: count,
          totalPages: Math.ceil(count / limit),
          currentPage: currentPage
        },
        message: this.i18n.t('turkish_airlines.listFetched', { lang })
      };
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('turkish_airlines.fetchFailed', { lang }), error);
    }
  }



  async getStatusReportByMonth(yearMonth: string, lang: string = 'tk') {
    try {
      const [year, month] = yearMonth.split('-').map(Number);
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

      const [result] = await this.sequelize.query(`
        WITH monthly_data AS (
            SELECT 
                t.status_guid,
                t.guid
            FROM tbl_turkish_airlines AS t
            WHERE t.datetime >= :startDate::timestamp 
              AND t.datetime < (:endDate::date + INTERVAL '1 day')
        ),
        total_count AS (
            SELECT COUNT(guid) AS overall_count FROM monthly_data
        ),
        grouped_data AS (
            SELECT 
                s.guid AS status_guid,
                s.name AS status_name,
                COUNT(t.guid) AS ticket_count
            FROM "tbl_Tstatuses" AS s
            LEFT JOIN monthly_data AS t ON t.status_guid = s.guid
            GROUP BY s.guid, s.name
        )
        SELECT 
            (SELECT json_agg(
                json_build_object(
                    'status_guid', g.status_guid,
                    'status_name', g.status_name,
                    'ticket_count', g.ticket_count,
                    'percentage', CASE 
                        WHEN tc.overall_count > 0 
                        THEN ROUND((g.ticket_count::numeric / tc.overall_count) * 100, 2) || '%' 
                        ELSE '0.00%' 
                    END
                )
            ) FROM grouped_data g CROSS JOIN total_count tc) AS status_distribution;
      `, {
        replacements: { startDate, endDate },
        type: QueryTypes.SELECT
      });

      return {
        status: 200,
        data: (result as any).status_distribution || [],
        message: this.i18n.t('turkish_airlines.statusReport', { lang })
      };
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('turkish_airlines.statusReportFailed', { lang }), error);
    }
  }



  async getQuarterTurkishAirline(quarter: number, lang: string = 'tk') {
    try {
      const currentYear = new Date().getFullYear();
      const previousYear = currentYear - 1;
      const rawData: any[] = await this.sequelize.query(
        `SELECT
           EXTRACT(YEAR FROM t.datetime)::int AS year,
           ROUND(SUM(t.base_fare)::numeric, 2)                   AS total_base_fare,
           ROUND(SUM(t.quoted_price)::numeric, 2)                AS total_quoted_price,
           ROUND(SUM(t.quoted_price - t.base_fare)::numeric, 2) AS profit,
           ROUND(
             GREATEST(
               COALESCE(SUM(t.total_price), 0) - COALESCE(SUM(tp.paid_amount), 0),
               0
             )::numeric, 2
           ) AS credit_price
         FROM tbl_turkish_airlines t
         LEFT JOIN LATERAL (
           SELECT COALESCE(SUM(p.amount), 0) AS paid_amount
           FROM tbl_turkish_payments p
           WHERE p.turkish_airline_guid = t.guid
         ) tp ON TRUE
         WHERE EXTRACT(QUARTER FROM t.datetime) = :quarter
           AND EXTRACT(YEAR   FROM t.datetime) IN (:currentYear, :previousYear)
         GROUP BY EXTRACT(YEAR FROM t.datetime)
         ORDER BY year ASC`,
        {
          replacements: { quarter, currentYear, previousYear },
          type: QueryTypes.SELECT,
        },
      );

      const profit2025 = Number(rawData.find((item: any) => item.year === previousYear)?.profit || 0);
      const profit2026 = Number(rawData.find((item: any) => item.year === currentYear)?.profit || 0);
      let percentage = '0%';
      if (profit2025 > 0) {
        const calc = (profit2026 / profit2025) * 100;
        percentage = `${Math.round(calc)}%`;
      }

      const total_credit_price = Math.round(
        rawData.reduce((sum, item) => sum + Number(item.credit_price || 0), 0) * 100,
      ) / 100;

      return {
        status: 200,
        data: rawData,
        achievement_percentage: percentage,
        total_credit_price,
        message: this.i18n.t('turkish_airlines.quarterlyReport', { lang }),
      };

    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('turkish_airlines.quarterlyReportFailed', { lang }), error);
    }
  }



  async updateTurkishAirline(updateDto: UpdateTurkishAirlineDto, lang: string) {
    const t = await this.sequelize.transaction();
    try {
      const turkishAirline = await this.turkishAirlineRepo.findByPk(updateDto.guid, { transaction: t });
      if (!turkishAirline) {
        await t.rollback();
        return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('turkish_airlines.notFound', { lang }));
      }
      let updateData: any = { ...updateDto };
      const isPaidFalse = updateDto.is_paid === false || (updateDto.is_paid as any) === 'false';
      if (isPaidFalse) {
        updateData.accepted_price = 0;
        updateData.returned_price = 0;
      }
      
      if (updateDto.client_guid && updateDto.client_guid !== turkishAirline.client_guid) {
        const client = await this.clientRepository.findByPk(updateDto.client_guid, { transaction: t });
        if (client) {
          updateData.passport_count = client.passport_count || 1;
        }
      } else if (!updateDto.client_guid) {
        updateData.passport_count = turkishAirline.passport_count;
      }

      const targetPrice = updateDto.total_price !== undefined
        ? Math.round(Number(updateDto.total_price))
        : (Number(turkishAirline.quoted_price) || Math.round(Number(turkishAirline.total_price)) || 0);

      const operatorGuid = updateDto.receiver_opr_guid || updateDto.assignment_opr_guid || turkishAirline.receiver_opr_guid || turkishAirline.assignment_opr_guid;

      const isResetStatus = updateDto.status_guid === '22f0d634-5798-4e5b-9d2b-34b94ec36fbf';

      if (isResetStatus) {
        await this.turkishPaymentRepo.destroy({
          where: { turkish_airline_guid: turkishAirline.guid },
          transaction: t
        });

        if (targetPrice > 0) {
          await this.turkishPaymentRepo.create({
            turkish_airline_guid: turkishAirline.guid,
            amount: targetPrice,
            payment_date: new Date(),
            opr_guid: operatorGuid
          } as any, { transaction: t });
        }
      } else {
        const isPaidTrue = updateDto.is_paid === true || (updateDto.is_paid as any) === 'true';
        const isPaidFalse = updateDto.is_paid === false || (updateDto.is_paid as any) === 'false';
        const willBePaid = isPaidTrue || (turkishAirline.is_paid === true && !isPaidFalse);

        if (willBePaid) {
          const payments = await this.turkishPaymentRepo.findAll({
            where: { turkish_airline_guid: turkishAirline.guid },
            order: [['index_number', 'ASC']],
            transaction: t
          });

          const currentTotalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
          const diff = Number((targetPrice - currentTotalPaid).toFixed(2));

          if (diff !== 0) {
            if (payments.length === 0) {
              if (targetPrice > 0) {
                await this.turkishPaymentRepo.create({
                  turkish_airline_guid: turkishAirline.guid,
                  amount: targetPrice,
                  payment_date: new Date(),
                  opr_guid: operatorGuid
                } as any, { transaction: t });
              }
            } else if (payments.length === 1) {
              await payments[0].update({
                amount: targetPrice,
                opr_guid: operatorGuid || payments[0].opr_guid
              }, { transaction: t });
            } else if (diff > 0) {
              const lastPayment = payments[payments.length - 1];
              await lastPayment.update({
                amount: Number((Number(lastPayment.amount) + diff).toFixed(2)),
                opr_guid: operatorGuid || lastPayment.opr_guid
              }, { transaction: t });
            } else {
              let amountToReduce = Math.abs(diff);
              for (let i = payments.length - 1; i >= 0 && amountToReduce > 0; i--) {
                const p = payments[i];
                const pAmount = Number(p.amount);
                if (pAmount <= amountToReduce && i > 0) {
                  await p.destroy({ transaction: t });
                  amountToReduce = Number((amountToReduce - pAmount).toFixed(2));
                } else {
                  const newAmount = Math.max(0, Number((pAmount - amountToReduce).toFixed(2)));
                  await p.update({
                    amount: newAmount,
                    opr_guid: operatorGuid || p.opr_guid
                  }, { transaction: t });
                  amountToReduce = 0;
                }
              }
            }
          }
        }
      }

      await turkishAirline.update(updateData, { transaction: t });
      await t.commit();

      const updatedTurkishAirline = await this.turkishAirlineRepo.findOne({
        where: { guid: updateDto.guid },
        include: this.getTurkishAirlineIncludes(),
        attributes: { include: this.getTurkishAttributes() as any }
      });
      const formattedData = this.formatTurkishAirlinePassport(updatedTurkishAirline);
      return { status: 200, data: formattedData, message: this.i18n.t('turkish_airlines.updated', { lang }) };
    } catch (error: any) {
      await t.rollback();
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('turkish_airlines.updateFailed', { lang }), error);
    }
  }


  async deleteTurkishAirline(guid: string, lang: string) {
    const t = await this.sequelize.transaction();
    try {
      const turkishAirline = await this.turkishAirlineRepo.findByPk(guid, { transaction: t });
      if (!turkishAirline) {
        await t.rollback();
        return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('turkish_airlines.notFound', { lang }));
      }
      await this.turkishPaymentRepo.destroy({ where: { turkish_airline_guid: guid }, transaction: t });
      await turkishAirline.destroy({ transaction: t });
      await t.commit();

      return successResponse(HttpStatuses.OK, null, this.i18n.t('turkish_airlines.deleted', { lang }));
    } catch (error: any) {
      await t.rollback();
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('turkish_airlines.deleteFailed', { lang }), error);
    }
  }
}
