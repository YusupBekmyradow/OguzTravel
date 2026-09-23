import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import { QueryTypes } from 'sequelize';
import { DashboardFilterDto } from './dto/dashboard-filter.dto';
import { Employee } from '../employee/entities/employee.entity';
import { User } from '../user/entities/user.entity';
import { UserType } from '../../enums/enums';
import { errorResponse } from '../../helpers/responseFunctions';
import { HttpStatuses } from '../../helpers/httpStatuses.enum';

const round2 = (val: number | string | null | undefined): number => {
  const num = Number(val) || 0;
  return Math.round(num * 100) / 100;
};

const calcPercentChange = (current: number, previous: number): number => {
  if (previous === 0) {
    return current === 0 ? 0 : 100;
  }
  return round2(((current - previous) / Math.abs(previous)) * 100);
};

const formatDate = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const shiftOneMonthBack = (date: Date): Date => {
  const d = new Date(date);
  const currentDay = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  const daysInPrevMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(currentDay, daysInPrevMonth));
  return d;
};

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private readonly sequelize: Sequelize,
    @InjectModel(Employee) private readonly employeeRepo: typeof Employee,
    @InjectModel(User) private readonly userRepo: typeof User,
  ) { }

  private async resolveScopeOffice(userPayload: any, requestedOffice?: string): Promise<string | null> {
    if (requestedOffice) return requestedOffice;

    const isAdmin = String(userPayload?.role || '').toLowerCase() === UserType.ADMIN.toLowerCase();
    if (isAdmin) return null;

    const directGuid = userPayload?.employee_guid || userPayload?.guid || userPayload?.id;
    if (directGuid) {
      const emp = await this.employeeRepo.findByPk(directGuid, { attributes: ['office_guid'] });
      if (emp?.office_guid) return emp.office_guid;

      const user = await this.userRepo.findByPk(directGuid, { attributes: ['employee_guid'] });
      if (user?.employee_guid) {
        const userEmp = await this.employeeRepo.findByPk(user.employee_guid, { attributes: ['office_guid'] });
        if (userEmp?.office_guid) return userEmp.office_guid;
      }
    }
    return null;
  }




  async getSummary(filters: DashboardFilterDto, userPayload: any, lang: string = 'tk') {
    try {
      const officeGuid = await this.resolveScopeOffice(userPayload, filters.office_guid);
      const now = new Date();
      let startDateStr: string;
      let endDateStr: string;
      let startDateObj: Date;
      let endDateObj: Date;

      if (filters.start_date) {
        startDateStr = filters.start_date.length === 10
          ? `${filters.start_date} 00:00:00`
          : filters.start_date;
        startDateObj = new Date(startDateStr);
      } else {
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        startDateStr = `${y}-${m}-01 00:00:00`;
        startDateObj = new Date(startDateStr);
      }
      if (filters.end_date) {
        endDateStr = filters.end_date.length === 10
          ? `${filters.end_date} 23:59:59.999`
          : filters.end_date;
        endDateObj = new Date(endDateStr);
      } else {
        endDateStr = now.toISOString();
        endDateObj = now;
      }
      const prevStartDateObj = shiftOneMonthBack(startDateObj);
      const prevEndDateObj = shiftOneMonthBack(endDateObj);

      const prevStartDateStr = `${formatDate(prevStartDateObj)} 00:00:00`;
      const prevEndDateStr = `${formatDate(prevEndDateObj)} 23:59:59.999`;

      const currentConditions: string[] = ['tc.datetime >= :startDate', 'tc.datetime <= :endDate'];
      const currentReplacements: Record<string, any> = {
        startDate: startDateStr,
        endDate: endDateStr,
      };

      const prevConditions: string[] = ['tc.datetime >= :prevStartDate', 'tc.datetime <= :prevEndDate'];
      const prevReplacements: Record<string, any> = {
        prevStartDate: prevStartDateStr,
        prevEndDate: prevEndDateStr,
      };

      if (officeGuid) {
        currentConditions.push('tc.office_guid = :office_guid');
        currentReplacements.office_guid = officeGuid;

        prevConditions.push('tc.office_guid = :prev_office_guid');
        prevReplacements.prev_office_guid = officeGuid;
      }

      const currentWhere = `WHERE ${currentConditions.join(' AND ')}`;
      const prevWhere = `WHERE ${prevConditions.join(' AND ')}`;

      const currentQuery = `
        SELECT
          UPPER(TRIM(tc.currency))                         AS currency,
          COALESCE(SUM(tc.net_price), 0)::numeric(14,2)    AS expense,
          COALESCE(SUM(tc.sale_price), 0)::numeric(14,2)   AS income,
          COALESCE(SUM(tc.profit), 0)::numeric(14,2)       AS profit,
          COALESCE(SUM(tc.credit_price), 0)::numeric(14,2) AS credit
        FROM tbl_total_calculations tc
        ${currentWhere}
        GROUP BY UPPER(TRIM(tc.currency))
      `;

      const prevQuery = `
        SELECT
          UPPER(TRIM(tc.currency))                         AS currency,
          COALESCE(SUM(tc.net_price), 0)::numeric(14,2)    AS expense,
          COALESCE(SUM(tc.sale_price), 0)::numeric(14,2)   AS income,
          COALESCE(SUM(tc.profit), 0)::numeric(14,2)       AS profit,
          COALESCE(SUM(tc.credit_price), 0)::numeric(14,2) AS credit
        FROM tbl_total_calculations tc
        ${prevWhere}
        GROUP BY UPPER(TRIM(tc.currency))
      `;

      const chartQuery = `
        SELECT
          TO_CHAR(tc.datetime, 'YYYY-MM-DD')               AS date,
          UPPER(TRIM(tc.currency))                         AS currency,
          COALESCE(SUM(tc.net_price), 0)::numeric(14,2)    AS expense,
          COALESCE(SUM(tc.sale_price), 0)::numeric(14,2)   AS income,
          COALESCE(SUM(tc.profit), 0)::numeric(14,2)       AS profit,
          COALESCE(SUM(tc.credit_price), 0)::numeric(14,2) AS credit
        FROM tbl_total_calculations tc
        ${currentWhere}
        GROUP BY TO_CHAR(tc.datetime, 'YYYY-MM-DD'), UPPER(TRIM(tc.currency))
        ORDER BY date ASC
      `;

      const [currentRows, prevRows, chartRows] = await Promise.all([
        this.sequelize.query<any>(currentQuery, {
          replacements: currentReplacements,
          type: QueryTypes.SELECT,
        }),
        this.sequelize.query<any>(prevQuery, {
          replacements: prevReplacements,
          type: QueryTypes.SELECT,
        }),
        this.sequelize.query<any>(chartQuery, {
          replacements: currentReplacements,
          type: QueryTypes.SELECT,
        }),
      ]);

      const curMap = (rows: any[]) => {
        const map = new Map<string, any>();
        rows.forEach((r) => {
          map.set(r.currency, {
            expense: round2(r.expense),
            income: round2(r.income),
            profit: round2(r.profit),
            credit: round2(r.credit),
          });
        });
        return map;
      };

      const curTotals = curMap(currentRows);
      const prevTotals = curMap(prevRows);

      const buildCardCurrency = (field: 'expense' | 'income' | 'credit' | 'profit', cur: string) => {
        const empty = { expense: 0, income: 0, profit: 0, credit: 0 };
        const cRow = curTotals.get(cur) || empty;
        const pRow = prevTotals.get(cur) || empty;

        const total = round2(cRow[field]);
        const previous = round2(pRow[field]);
        const change_amount = round2(total - previous);
        const change_percent = calcPercentChange(total, previous);

        return {
          total,
          previous,
          change_amount,
          change_percent,
        };
      };

      const cards = {
        expense: {
          USD: buildCardCurrency('expense', 'USD'),
          TMT: buildCardCurrency('expense', 'TMT'),
        },
        income: {
          USD: buildCardCurrency('income', 'USD'),
          TMT: buildCardCurrency('income', 'TMT'),
        },
        credit: {
          USD: buildCardCurrency('credit', 'USD'),
          TMT: buildCardCurrency('credit', 'TMT'),
        },
        profit: {
          USD: buildCardCurrency('profit', 'USD'),
          TMT: buildCardCurrency('profit', 'TMT'),
        },
      };

      const dailyMap = new Map<string, any>();
      chartRows.forEach((r) => {
        dailyMap.set(`${r.date}_${r.currency}`, {
          expense: round2(r.expense),
          income: round2(r.income),
          profit: round2(r.profit),
          credit: round2(r.credit),
        });
      });
      const chartList: any[] = [];
      const cursor = new Date(startDateObj);
      cursor.setHours(0, 0, 0, 0);

      const targetEnd = new Date(endDateObj);
      targetEnd.setHours(23, 59, 59, 999);

      const currencies = ['USD', 'TMT'];

      while (cursor <= targetEnd) {
        const dStr = formatDate(cursor);
        for (const cur of currencies) {
          const val = dailyMap.get(`${dStr}_${cur}`) || { expense: 0, income: 0, profit: 0, credit: 0 };
          chartList.push({
            date: dStr,
            currency: cur,
            expense: val.expense,
            income: val.income,
            profit: val.profit,
            credit: val.credit,
          });
        }
        cursor.setDate(cursor.getDate() + 1);
      }

      return {
        status: 200,
        data: {
          cards,
          chart: chartList,
        },
        message: 'Dashboard maglumatlary üstünlikli alyndy',
      };
    } catch (error: any) {
      this.logger.error('Error fetching dashboard summary:', error);
      return errorResponse(
        HttpStatuses.INTERNAL_SERVER_ERROR,
        'Dashboard maglumatlaryny alyp bolmady',
        error,
      );
    }
  }
}
