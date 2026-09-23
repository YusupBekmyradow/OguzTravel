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

const r2 = (v: any) => Math.round((Number(v) || 0) * 100) / 100;
const pct = (cur: number, prev: number) => (prev === 0 ? (cur === 0 ? 0 : 100) : r2(((cur - prev) / Math.abs(prev)) * 100));
const fmtDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const prevMonth = (d: Date) => {
  const p = new Date(d);
  p.setDate(1);
  p.setMonth(p.getMonth() - 1);
  p.setDate(Math.min(d.getDate(), new Date(p.getFullYear(), p.getMonth() + 1, 0).getDate()));
  return p;
};
const parseJson = (v: any) => (typeof v === 'object' && v !== null ? v : (() => { try { return JSON.parse(v); } catch { return { tk: v, ru: v, en: v }; } })());

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private readonly sequelize: Sequelize,
    @InjectModel(Employee) private readonly employeeRepo: typeof Employee,
    @InjectModel(User) private readonly userRepo: typeof User,
  ) { }

  private async resolveOffice(userPayload: any, officeFilter?: string): Promise<string | null> {
    if (officeFilter) return officeFilter;
    if (String(userPayload?.role || '').toLowerCase() === UserType.ADMIN.toLowerCase()) return null;

    const id = userPayload?.employee_guid || userPayload?.guid || userPayload?.id;
    if (!id) return null;

    const emp = await this.employeeRepo.findByPk(id, { attributes: ['office_guid'] });
    if (emp?.office_guid) return emp.office_guid;

    const user = await this.userRepo.findByPk(id, { attributes: ['employee_guid'] });
    if (user?.employee_guid) {
      const uEmp = await this.employeeRepo.findByPk(user.employee_guid, { attributes: ['office_guid'] });
      if (uEmp?.office_guid) return uEmp.office_guid;
    }
    return null;
  }

  private resolveDates(filters: DashboardFilterDto) {
    const now = new Date();
    const start = filters.start_date
      ? (filters.start_date.length === 10 ? `${filters.start_date} 00:00:00` : filters.start_date)
      : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01 00:00:00`;
    const end = filters.end_date
      ? (filters.end_date.length === 10 ? `${filters.end_date} 23:59:59.999` : filters.end_date)
      : now.toISOString();
    return { start, end, startObj: new Date(start), endObj: new Date(end) };
  }

  private buildWhere(startDate: string, endDate: string, officeGuid?: string | null, currency?: string, prefix = '') {
    const conds = [`tc.datetime >= :${prefix}startDate`, `tc.datetime <= :${prefix}endDate`];
    const rp: Record<string, any> = { [`${prefix}startDate`]: startDate, [`${prefix}endDate`]: endDate };

    if (officeGuid) {
      conds.push(`tc.office_guid = :${prefix}office_guid`);
      rp[`${prefix}office_guid`] = officeGuid;
    }
    if (currency?.trim()) {
      conds.push(`UPPER(TRIM(tc.currency)) = :${prefix}currency`);
      rp[`${prefix}currency`] = currency.trim().toUpperCase();
    }
    return { where: `WHERE ${conds.join(' AND ')}`, rp };
  }

  private sql<T = any>(query: string, replacements: Record<string, any>): Promise<T[]> {
    return this.sequelize.query<any>(query, { replacements, type: QueryTypes.SELECT });
  }

  private sumSql(where: string) {
    return `
      SELECT UPPER(TRIM(tc.currency)) AS currency,
        COALESCE(SUM(tc.net_price), 0)::numeric(14,2)    AS expense,
        COALESCE(SUM(tc.sale_price), 0)::numeric(14,2)   AS income,
        COALESCE(SUM(tc.profit), 0)::numeric(14,2)       AS profit,
        COALESCE(SUM(tc.credit_price), 0)::numeric(14,2) AS credit
      FROM tbl_total_calculations tc ${where}
      GROUP BY UPPER(TRIM(tc.currency))`;
  }



  async getSummary(filters: DashboardFilterDto, userPayload: any, lang = 'tk') {
    try {
      const officeGuid = await this.resolveOffice(userPayload, filters.office_guid);
      const { start, end, startObj, endObj } = this.resolveDates(filters);

      const prevStart = `${fmtDate(prevMonth(startObj))} 00:00:00`;
      const prevEnd = `${fmtDate(prevMonth(endObj))} 23:59:59.999`;

      const { where: curWhere, rp: curRp } = this.buildWhere(start, end, officeGuid, filters.currency);
      const { where: prevWhere, rp: prevRp } = this.buildWhere(prevStart, prevEnd, officeGuid, filters.currency, 'p_');

      const chartQ = `
        SELECT TO_CHAR(tc.datetime, 'YYYY-MM-DD') AS date,
          UPPER(TRIM(tc.currency)) AS currency,
          COALESCE(SUM(tc.net_price), 0)::numeric(14,2)    AS expense,
          COALESCE(SUM(tc.sale_price), 0)::numeric(14,2)   AS income,
          COALESCE(SUM(tc.profit), 0)::numeric(14,2)       AS profit,
          COALESCE(SUM(tc.credit_price), 0)::numeric(14,2) AS credit
        FROM tbl_total_calculations tc ${curWhere}
        GROUP BY TO_CHAR(tc.datetime, 'YYYY-MM-DD'), UPPER(TRIM(tc.currency))
        ORDER BY date ASC`;

      const [curRows, prevRows, chartRows]: [any[], any[], any[]] = await Promise.all([
        this.sql(this.sumSql(curWhere), curRp),
        this.sql(this.sumSql(prevWhere), prevRp),
        this.sql(chartQ, curRp),
      ]);

      const toMap = (rows: any[]) =>
        new Map(rows.map((r) => [r.currency, { expense: r2(r.expense), income: r2(r.income), profit: r2(r.profit), credit: r2(r.credit) }]));
      const curMap = toMap(curRows);
      const prevMap = toMap(prevRows);
      const zero = { expense: 0, income: 0, profit: 0, credit: 0 };

      const card = (field: 'expense' | 'income' | 'credit' | 'profit', cur: string) => {
        const total = (curMap.get(cur) || zero)[field];
        const previous = (prevMap.get(cur) || zero)[field];
        return { total, previous, change_amount: r2(total - previous), change_percent: pct(total, previous) };
      };

      const cards = Object.fromEntries(
        (['expense', 'income', 'credit', 'profit'] as const).map((f) => [f, { USD: card(f, 'USD'), TMT: card(f, 'TMT') }])
      );

      const dailyMap = new Map(chartRows.map((r) => [`${r.date}_${r.currency}`, { expense: r2(r.expense), income: r2(r.income), profit: r2(r.profit), credit: r2(r.credit) }]));
      const chart: any[] = [];
      const cursor = new Date(startObj); cursor.setHours(0, 0, 0, 0);
      const endCursor = new Date(endObj); endCursor.setHours(23, 59, 59, 999);

      while (cursor <= endCursor) {
        const d = fmtDate(cursor);
        for (const cur of ['USD', 'TMT']) {
          const v = dailyMap.get(`${d}_${cur}`) || zero;
          chart.push({ date: d, currency: cur, ...v });
        }
        cursor.setDate(cursor.getDate() + 1);
      }

      return { status: 200, data: { cards, chart }, message: 'Dashboard maglumatlary üstünlikli alyndy' };
    } catch (e: any) {
      this.logger.error('getSummary error:', e);
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Dashboard maglumatlaryny alyp bolmady', e);
    }
  }




  async getByCategory(filters: DashboardFilterDto, userPayload: any, lang = 'tk') {
    try {
      const officeGuid = await this.resolveOffice(userPayload, filters.office_guid);
      const { start, end } = this.resolveDates(filters);
      const { where, rp } = this.buildWhere(start, end, officeGuid, filters.currency);

      const sql = `
        SELECT cat.guid AS category_guid, cat.name AS category_name,
          COUNT(tc.guid)::int AS count,
          COALESCE(SUM(tc.sale_price), 0)::numeric(14,2)  AS income,
          COALESCE(SUM(tc.net_price), 0)::numeric(14,2)   AS expense,
          COALESCE(SUM(tc.profit), 0)::numeric(14,2)      AS profit,
          CASE WHEN COALESCE(SUM(tc.sale_price), 0) = 0 THEN 0
            ELSE ROUND((COALESCE(SUM(tc.profit), 0) / NULLIF(SUM(tc.sale_price), 0)) * 100, 1)
          END AS margin_percent
        FROM tbl_total_calculations tc
        LEFT JOIN tbl_categories cat ON cat.guid = tc.category_guid
        ${where}
        GROUP BY cat.guid, cat.name
        ORDER BY income DESC`;

      const countSql = `
        SELECT COALESCE(SUM(tc.sale_price), 0)::numeric(14,2) AS income,
               COALESCE(SUM(tc.net_price), 0)::numeric(14,2)  AS expense,
               COALESCE(SUM(tc.profit), 0)::numeric(14,2)     AS profit,
               COUNT(tc.guid)::int                            AS count
        FROM tbl_total_calculations tc ${where}`;

      const [rows, totals]: [any[], any[]] = await Promise.all([
        this.sql(sql, rp),
        this.sql(countSql, rp),
      ]);

      const tot = totals[0] || {};
      const totalIncome = r2(tot.income);
      const totalExpense = r2(tot.expense);
      const totalProfit = r2(tot.profit);
      const totalCount = Number(tot.count) || 0;
      const totalMargin = totalIncome > 0 ? r2((totalProfit / totalIncome) * 100) : 0;

      const items = rows.map((r) => {
        const income = r2(r.income);
        return {
          category_guid: r.category_guid,
          category_name: parseJson(r.category_name),
          count: Number(r.count) || 0,
          income,
          expense: r2(r.expense),
          profit: r2(r.profit),
          margin_percent: r2(r.margin_percent),
          share_percent: totalIncome > 0 ? r2((income / totalIncome) * 100) : 0,
        };
      });

      return {
        status: 200,
        data: {
          items,
          total: { count: totalCount, income: totalIncome, expense: totalExpense, profit: totalProfit, margin_percent: totalMargin },
        },
        message: 'Hyzmatlar boýunça maglumatlar alyndy',
      };
    } catch (e: any) {
      this.logger.error('getByCategory error:', e);
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Hyzmatlar boýunça maglumatlaryny alyp bolmady', e);
    }
  }





  async getByOperator(filters: DashboardFilterDto, userPayload: any, lang = 'tk') {
    try {
      const officeGuid = await this.resolveOffice(userPayload, filters.office_guid);
      const { start, end } = this.resolveDates(filters);
      const { where, rp } = this.buildWhere(start, end, officeGuid, filters.currency);

      const sql = `
        SELECT emp.guid AS operator_guid, emp."fullName" AS operator_name,
          COUNT(tc.guid)::int AS count,
          COALESCE(SUM(tc.sale_price), 0)::numeric(14,2)  AS income,
          COALESCE(SUM(tc.net_price), 0)::numeric(14,2)   AS expense,
          COALESCE(SUM(tc.profit), 0)::numeric(14,2)      AS profit
        FROM tbl_total_calculations tc
        LEFT JOIN tbl_employees emp ON emp.guid = tc.receiver_opr_guid
        ${where}
        GROUP BY emp.guid, emp."fullName"
        ORDER BY income DESC`;

      const countSql = `
        SELECT COALESCE(SUM(tc.sale_price), 0)::numeric(14,2) AS income,
               COUNT(tc.guid)::int                            AS count
        FROM tbl_total_calculations tc ${where}`;

      const [rows, totals]: [any[], any[]] = await Promise.all([
        this.sql(sql, rp),
        this.sql(countSql, rp),
      ]);

      const tot = totals[0] || {};
      const totalIncome = r2(tot.income);
      const totalCount = Number(tot.count) || 0;

      const items = rows.map((r, i) => {
        const income = r2(r.income);
        return {
          rank: i + 1,
          operator_guid: r.operator_guid,
          operator_name: r.operator_name,
          count: Number(r.count) || 0,
          income,
          expense: r2(r.expense),
          profit: r2(r.profit),
          share_percent: totalIncome > 0 ? r2((income / totalIncome) * 100) : 0,
        };
      });

      return {
        status: 200,
        data: { items, total: { count: totalCount, income: totalIncome } },
        message: 'Operatorlar boýunça maglumatlar alyndy',
      };
    } catch (e: any) {
      this.logger.error('getByOperator error:', e);
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Operatorlar boýunça maglumatlaryny alyp bolmady', e);
    }
  }
}
