import { Injectable } from '@nestjs/common';
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
import { QueryTypes } from 'sequelize';

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
    private sequelize: Sequelize
  ) { }



  async getTurkishReport(yearMonth: string) {
    try {
      const [year, month] = yearMonth.split('-').map(Number);
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
      const listQuery = `
      SELECT 
          TO_CHAR(d.flight_date, 'DD') AS datetime,
          o."fullName" AS full_name,
          o."shortName" AS shortName,
          COALESCE(SUM(t.base_fare), 0) AS base_fare_sum,
          COALESCE(SUM(t.quoted_price), 0) AS quoted_price_sum
      FROM tbl_offices AS o
      CROSS JOIN (
          SELECT generate_series(:startDate::date, :endDate::date, '1 day'::interval)::date AS flight_date
      ) AS d
      LEFT JOIN tbl_turkish_airlines AS t 
          ON t.office_guid = o.guid 
          AND DATE(t.datetime) = d.flight_date
      GROUP BY d.flight_date, o."fullName", o."shortName"
      ORDER BY d.flight_date ASC, o."fullName" ASC;
    `;

      const dailyTotalsQuery = `
      SELECT 
          TO_CHAR(d.flight_date, 'DD') AS datetime,
          COALESCE(SUM(t.base_fare), 0) AS daily_total_base,
          COALESCE(SUM(t.quoted_price), 0) AS daily_total_quoted
      FROM (
          SELECT generate_series(:startDate::date, :endDate::date, '1 day'::interval)::date AS flight_date
      ) AS d
      LEFT JOIN tbl_turkish_airlines AS t ON DATE(t.datetime) = d.flight_date
      GROUP BY d.flight_date
      ORDER BY d.flight_date ASC;
    `;

      const footerQuery = `
      SELECT 
          o."shortName" AS office,
          COALESCE(SUM(t.base_fare), 0) AS total_base,
          COALESCE(SUM(t.quoted_price), 0) AS total_quoted
      FROM tbl_offices AS o
      LEFT JOIN tbl_turkish_airlines AS t 
          ON t.office_guid = o.guid 
          AND TO_CHAR(t.datetime, 'YYYY-MM') = :yearMonth
      GROUP BY o."shortName"
      ORDER BY o."shortName" ASC;
    `;

      const [data, dailyTotals, footerResult] = await Promise.all([
        this.sequelize.query(listQuery, { replacements: { startDate, endDate }, type: QueryTypes.SELECT }),
        this.sequelize.query(dailyTotalsQuery, { replacements: { startDate, endDate }, type: QueryTypes.SELECT }),
        this.sequelize.query(footerQuery, { replacements: { yearMonth }, type: QueryTypes.SELECT })
      ]);

      const footer = (footerResult as FooterRow[]).map(item => ({
        ...item,
        profit: Number(item.total_quoted) - Number(item.total_base)
      }));

      const totals = footer.reduce((acc, curr) => {
        acc.total_base += Number(curr.total_base || 0);
        acc.total_quoted += Number(curr.total_quoted || 0);
        acc.profit += Number(curr.profit || 0);
        return acc;
      }, { total_base: 0, total_quoted: 0, profit: 0 });

      const workingDaysCount = (dailyTotals as any[]).filter(day =>
        Number(day.daily_total_base || 0) > 0 || Number(day.daily_total_quoted || 0) > 0
      ).length;

      const grandTotal = {
        month_total_base: totals.total_base,
        month_total_quoted: totals.total_quoted,
        month_profit: totals.profit,
        working_days_count: workingDaysCount
      };

      const footerWithPercent = footer.map((item) => ({
        ...item,
        percentage: grandTotal.month_profit !== 0
          ? ((Number(item.profit) / grandTotal.month_profit) * 100).toFixed(2) + '%'
          : '0.00%'
      }));

      return {
        status: 200,
        data,
        dailyTotals,
        footer: footerWithPercent,
        grandTotal,
        message: 'Report generated successfully'
      };
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Report generation failed', error);
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
            WHEN "TurkishAirline".total_price > 0 
            THEN CONCAT(ROUND(((SUM(tp.amount) / "TurkishAirline".total_price) * 100)::numeric, 2), '%')
            ELSE '100%'
          END
        FROM "tbl_turkish_payments" AS tp
        WHERE tp.turkish_airline_guid = "TurkishAirline"."guid"
      )`),
        'paidPercentage'
      ]
    ];
  }

  async addTurkishAirline(createTurkishAirlineDto: CreateTurkishAirlineDto) {
    try {
      const turkishAirline = await this.turkishAirlineRepo.create(
        { ...createTurkishAirlineDto } as any,
        { hooks: true }
      );
      const newTurkishAirline = await this.turkishAirlineRepo.findOne({
        where: { guid: turkishAirline.guid },
        include: this.getTurkishAirlineIncludes(),
        attributes: { include: this.getTurkishAttributes() as any }
      });

      if (!newTurkishAirline) {
        return errorResponse(HttpStatuses.NOT_FOUND, 'TurkishAirline not found');
      }
      return {
        status: 201,
        data: newTurkishAirline,
        message: 'TurkishAirline created successfully'
      };
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Creation failed', error);
    }
  }


  async getAllTurkishAirline(page: number = 1, limit: number = 10) {
    try {
      const currentPage = Math.max(1, Number(page));
      const currentLimit = Math.max(1, Number(limit));
      const offset = (currentPage - 1) * currentLimit;

      const { rows, count } = await this.turkishAirlineRepo.findAndCountAll({
        include: this.getTurkishAirlineIncludes(),
        attributes: { include: this.getTurkishAttributes() as any },
        order: [['index_number', 'DESC']],
        limit: Number(limit),
        offset: Number(offset),
      });

      return {
        status: 200,
        data: rows,
        meta: {
          totalItems: count,
          totalPages: Math.ceil(count / limit),
          currentPage: currentPage
        },
        message: 'TurkishAirline fetched successfully'
      };
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'TurkishAirline fetching error', error);
    }
  }


  async updateTurkishAirline(updateDto: UpdateTurkishAirlineDto) {
    try {
      const turkishAirline = await this.turkishAirlineRepo.findByPk(updateDto.guid);
      if (!turkishAirline) return errorResponse(HttpStatuses.NOT_FOUND, 'TurkishAirline not found');

      await turkishAirline.update(updateDto);

      const updatedTurkishAirline = await this.turkishAirlineRepo.findOne({
        where: { guid: updateDto.guid },
        include: this.getTurkishAirlineIncludes(),
        attributes: { include: this.getTurkishAttributes() as any }
      });

      return { status: 200, data: updatedTurkishAirline, message: 'TurkishAirline updated successfully' };
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Update failed', error);
    }
  }

  async deleteTurkishAirline(guid: string) {
    try {
      const turkishAirline = await this.turkishAirlineRepo.findByPk(guid);
      if (!turkishAirline) {
        return errorResponse(HttpStatuses.NOT_FOUND, 'TurkishAirline not found');
      }
      await turkishAirline.destroy();

      return successResponse(HttpStatuses.OK, null, 'TurkishAirline deleted successfully');
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Deletion failed', error)
    }
  }
}
