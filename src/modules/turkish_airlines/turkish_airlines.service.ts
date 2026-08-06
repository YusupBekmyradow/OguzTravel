import { Injectable } from '@nestjs/common';
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

interface FooterRow {
  office: string;
  total_base: number | string;
  total_quoted: number | string;
  profit?: number;
  percentage?: string;
}


@Injectable()
export class TurkishAirlinesService {
  constructor(
    @InjectModel(TurkishAirline) private turkishAirlineRepo: typeof TurkishAirline,
    @InjectModel(Client) private clientRepository: typeof Client,
    private sequelize: Sequelize,
    private readonly i18n: I18nService,
  ) { }

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
              o."fullName" AS full_name,
              o."shortName" AS shortName,
              COALESCE(SUM(t.base_fare), 0) AS base_fare,
              COALESCE(SUM(t.quoted_price), 0) AS quoted_price
          FROM tbl_offices AS o
          CROSS JOIN date_series AS d
          LEFT JOIN tbl_turkish_airlines AS t ON t.office_guid = o.guid AND DATE(t.datetime) = d.flight_date
          GROUP BY d.flight_date, o."fullName", o."shortName"
      )
      SELECT 
        (SELECT json_agg(r) FROM (SELECT TO_CHAR(flight_date, 'DD') AS datetime, full_name, shortname, base_fare AS base_fare_sum, quoted_price AS quoted_price_sum FROM raw_data ORDER BY flight_date, shortname) r) AS data,
        
        (SELECT json_agg(d) FROM (SELECT TO_CHAR(flight_date, 'DD') AS datetime, SUM(base_fare) AS daily_total_base, SUM(quoted_price) AS daily_total_quoted FROM raw_data GROUP BY flight_date ORDER BY flight_date) d) AS "dailyTotals",
        
        (SELECT json_agg(f) FROM (
            SELECT 
                full_name,
                shortName,
                SUM(base_fare) AS total_base, 
                SUM(quoted_price) AS total_quoted,
                (SUM(quoted_price) - SUM(base_fare)) AS profit
            FROM raw_data 
          GROUP BY full_name, shortName
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
      ]
    ];
  }


  async addTurkishAirline(createTurkishAirlineDto: CreateTurkishAirlineDto, lang: string) {
    try {
      const client = await this.clientRepository.findByPk(createTurkishAirlineDto.client_guid);

      const turkishAirline = await this.turkishAirlineRepo.create(
        {
          ...createTurkishAirlineDto,
          passport_count: client ? (client.passport_count || 1) : 1
        } as any,
        { hooks: true }
      );
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


  async getAllTurkishAirline(page: number = 1, limit: number = 10,
    filters: { datetime?: string; assignment_opr_guid?: string; receiver_opr_guid?: string; status_guid?: string; flight_date?: string; is_paid?: boolean | string; office_guid?: string; } = {},
    lang: string = 'tk',
  ) {
    try {
      const currentPage = Math.max(1, Number(page));
      const currentLimit = Math.max(1, Number(limit));
      const offset = (currentPage - 1) * currentLimit;

      const whereCondition: any = {};
      if (filters.datetime) {
        const dateOnly = filters.datetime.includes('T')
          ? filters.datetime.split('T')[0]
          : filters.datetime.trim();
        whereCondition.datetime = this.sequelize.where(
          this.sequelize.fn('date', this.sequelize.col('datetime')),
          '=',
          dateOnly
        );
      }
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
      const rawData: any = await this.sequelize.query(
        `SELECT 
         EXTRACT(YEAR FROM datetime)::int AS year,
         ROUND(SUM(base_fare)::numeric, 2) AS total_base_fare,
         ROUND(SUM(quoted_price)::numeric, 2) AS total_quoted_price,
         ROUND(SUM(quoted_price - base_fare)::numeric, 2) AS profit
       FROM tbl_turkish_airlines
       WHERE EXTRACT(QUARTER FROM datetime) = :quarter
         AND EXTRACT(YEAR FROM datetime) IN (:currentYear, :previousYear)
       GROUP BY EXTRACT(YEAR FROM datetime)
       ORDER BY year ASC`,
        {
          replacements: { quarter, currentYear, previousYear },
          type: QueryTypes.SELECT,
        },
      );
      const profit2025 = Number(rawData.find((item: any) => item.year === previousYear)?.profit || 0);
      const profit2026 = Number(rawData.find((item: any) => item.year === currentYear)?.profit || 0);
      let percentage = "0%";
      if (profit2025 > 0) {
        const calc = (profit2026 / profit2025) * 100;
        percentage = `${Math.round(calc)}%`;
      }
      return {
        status: 200,
        data: rawData,
        achievement_percentage: percentage,
        message: this.i18n.t('turkish_airlines.quarterlyReport', { lang })
      };

    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('turkish_airlines.quarterlyReportFailed', { lang }), error);
    }
  }



  async updateTurkishAirline(updateDto: UpdateTurkishAirlineDto, lang: string) {
    try {
      const turkishAirline = await this.turkishAirlineRepo.findByPk(updateDto.guid);
      if (!turkishAirline) return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('turkish_airlines.notFound', { lang }));
      let updateData: any = { ...updateDto };
      if (updateDto.client_guid && updateDto.client_guid !== turkishAirline.client_guid) {
        const client = await this.clientRepository.findByPk(updateDto.client_guid);
        if (client) {
          updateData.passport_count = client.passport_count || 1;
        }
      } else if (!updateDto.client_guid) {
        updateData.passport_count = turkishAirline.passport_count;
      }
      await turkishAirline.update(updateData);
      const updatedTurkishAirline = await this.turkishAirlineRepo.findOne({
        where: { guid: updateDto.guid },
        include: this.getTurkishAirlineIncludes(),
        attributes: { include: this.getTurkishAttributes() as any }
      });
      const formattedData = this.formatTurkishAirlinePassport(updatedTurkishAirline);
      return { status: 200, data: formattedData, message: this.i18n.t('turkish_airlines.updated', { lang }) };
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('turkish_airlines.updateFailed', { lang }), error);
    }
  }


  async deleteTurkishAirline(guid: string, lang: string) {
    try {
      const turkishAirline = await this.turkishAirlineRepo.findByPk(guid);
      if (!turkishAirline) {
        return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('turkish_airlines.notFound', { lang }));
      }
      await turkishAirline.destroy();

      return successResponse(HttpStatuses.OK, null, this.i18n.t('turkish_airlines.deleted', { lang }));
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('turkish_airlines.deleteFailed', { lang }), error)
    }
  }
}


