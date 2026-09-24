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

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private readonly sequelize: Sequelize,
    @InjectModel(Employee) private readonly employeeRepo: typeof Employee,
    @InjectModel(User) private readonly userRepo: typeof User,
  ) { }

  async getSummary(filters: DashboardFilterDto, userPayload: any, lang = 'tk') {
    try {
      // --- office ---
      let officeGuid: string | null = filters.office_guid || null;
      if (!officeGuid) {
        const isAdmin = String(userPayload?.role || '').toLowerCase() === UserType.ADMIN.toLowerCase();
        officeGuid = isAdmin ? null : (userPayload?.office_guid || null);
      }

      // --- dates ---
      const now = new Date();
      const start = filters.start_date
        ? (filters.start_date.length === 10 ? `${filters.start_date} 00:00:00` : filters.start_date)
        : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01 00:00:00`;
      const end = filters.end_date
        ? (filters.end_date.length === 10 ? `${filters.end_date} 23:59:59.999` : filters.end_date)
        : now.toISOString();
      const startObj = new Date(start);
      const endObj = new Date(end);

      const prevStart = `${fmtDate(prevMonth(startObj))} 00:00:00`;
      const prevEnd = `${fmtDate(prevMonth(endObj))} 23:59:59.999`;

      // --- current period WHERE ---
      const curConds = [`tc.datetime >= :startDate`, `tc.datetime <= :endDate`];
      const curRp: Record<string, any> = { startDate: start, endDate: end };
      if (officeGuid) {
        curConds.push(`tc.office_guid = :officeGuid`);
        curRp.officeGuid = officeGuid;
      }
      if (filters.currency?.trim()) {
        curConds.push(`UPPER(TRIM(tc.currency)) = :currency`);
        curRp.currency = filters.currency.trim().toUpperCase();
      }
      const curWhere = `WHERE ${curConds.join(' AND ')}`;

      // --- previous period WHERE ---
      const prevConds = [`tc.datetime >= :p_startDate`, `tc.datetime <= :p_endDate`];
      const prevRp: Record<string, any> = { p_startDate: prevStart, p_endDate: prevEnd };
      if (officeGuid) {
        prevConds.push(`tc.office_guid = :p_officeGuid`);
        prevRp.p_officeGuid = officeGuid;
      }
      if (filters.currency?.trim()) {
        prevConds.push(`UPPER(TRIM(tc.currency)) = :p_currency`);
        prevRp.p_currency = filters.currency.trim().toUpperCase();
      }
      const prevWhere = `WHERE ${prevConds.join(' AND ')}`;

      const sumQuery = (where: string) => `
        SELECT UPPER(TRIM(tc.currency)) AS currency,
          COALESCE(SUM(tc.net_price), 0)::numeric(14,2)    AS expense,
          COALESCE(SUM(tc.sale_price), 0)::numeric(14,2)   AS income,
          COALESCE(SUM(tc.profit), 0)::numeric(14,2)       AS profit,
          COALESCE(SUM(tc.credit_price), 0)::numeric(14,2) AS credit
        FROM tbl_total_calculations tc ${where}
        GROUP BY UPPER(TRIM(tc.currency))`;

      const chartQuery = `
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
        this.sequelize.query<any>(sumQuery(curWhere), { replacements: curRp, type: QueryTypes.SELECT }),
        this.sequelize.query<any>(sumQuery(prevWhere), { replacements: prevRp, type: QueryTypes.SELECT }),
        this.sequelize.query<any>(chartQuery, { replacements: curRp, type: QueryTypes.SELECT }),
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




  async getOperatorsRating(filters: DashboardFilterDto, userPayload: any, lang = 'tk') {
    try {

      let officeGuid: string | null = filters.office_guid || null;
      if (!officeGuid) {
        const isAdmin = String(userPayload?.role || '').toLowerCase() === UserType.ADMIN.toLowerCase();
        officeGuid = isAdmin ? null : (userPayload?.office_guid || null);
      }

      const start = filters.start_date
        ? (filters.start_date.length === 10 ? `${filters.start_date} 00:00:00` : filters.start_date)
        : null;
      const end = filters.end_date
        ? (filters.end_date.length === 10 ? `${filters.end_date} 23:59:59.999` : filters.end_date)
        : null;


      const conds = [`tc.receiver_opr_guid IS NOT NULL`];
      const rp: Record<string, any> = {};

      if (start) {
        conds.push(`tc.datetime >= :startDate`);
        rp.startDate = start;
      }
      if (end) {
        conds.push(`tc.datetime <= :endDate`);
        rp.endDate = end;
      }
      if (officeGuid) {
        conds.push(`tc.office_guid = :officeGuid`);
        rp.officeGuid = officeGuid;
      }
      if (filters.currency?.trim()) {
        conds.push(`UPPER(TRIM(tc.currency)) = :currency`);
        rp.currency = filters.currency.trim().toUpperCase();
      }
      const where = `WHERE ${conds.join(' AND ')}`;

      const query = `
        SELECT tc.receiver_opr_guid AS operator_guid,
          e."fullName" AS operator_name,
          UPPER(TRIM(tc.currency)) AS currency,
          COUNT(*)::int AS count,
          COALESCE(SUM(tc.sale_price), 0)::numeric(14,2) AS sale,
          COALESCE(SUM(tc.profit), 0)::numeric(14,2)     AS profit
        FROM tbl_total_calculations tc
        LEFT JOIN tbl_employees e ON e.guid = tc.receiver_opr_guid
        ${where}
        GROUP BY tc.receiver_opr_guid, e."fullName", UPPER(TRIM(tc.currency))
        ORDER BY sale DESC`;

      const rows: any[] = await this.sequelize.query<any>(query, { replacements: rp, type: QueryTypes.SELECT });

      const totalByCurrency = new Map<string, number>();
      for (const r of rows) {
        totalByCurrency.set(r.currency, (totalByCurrency.get(r.currency) || 0) + Number(r.count));
      }

      const data = rows.map((r) => {
        const totalCount = totalByCurrency.get(r.currency) || 0;
        return {
          operator_guid: r.operator_guid,
          operator_name: r.operator_name || 'Näbelli',
          currency: r.currency,
          count: Number(r.count),
          percent: totalCount === 0 ? 0 : r2((Number(r.count) * 100) / totalCount),
          sale: r2(r.sale),
          profit: r2(r.profit),
        };
      });

      return { status: 200, data, message: 'Operatorlaryň reýtingi üstünlikli alyndy' };
    } catch (e: any) {
      this.logger.error('getOperatorsRating error:', e);
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Operatorlaryň reýtingini alyp bolmady', e);
    }
  }




  async getCategoryRating(filters: DashboardFilterDto, userPayload: any, lang = 'tk') {
    try {
      let officeGuid: string | null = filters.office_guid || null;
      if (!officeGuid) {
        const isAdmin = String(userPayload?.role || '').toLowerCase() === UserType.ADMIN.toLowerCase();
        officeGuid = isAdmin ? null : (userPayload?.office_guid || null);
      }

      const start = filters.start_date
        ? (filters.start_date.length === 10 ? `${filters.start_date} 00:00:00` : filters.start_date)
        : null;
      const end = filters.end_date
        ? (filters.end_date.length === 10 ? `${filters.end_date} 23:59:59.999` : filters.end_date)
        : null;

      const conds = [`tc.category_guid IS NOT NULL`];
      const rp: Record<string, any> = {};

      if (start) {
        conds.push(`tc.datetime >= :startDate`);
        rp.startDate = start;
      }
      if (end) {
        conds.push(`tc.datetime <= :endDate`);
        rp.endDate = end;
      }
      if (officeGuid) {
        conds.push(`tc.office_guid = :officeGuid`);
        rp.officeGuid = officeGuid;
      }
      if (filters.currency?.trim()) {
        conds.push(`UPPER(TRIM(tc.currency)) = :currency`);
        rp.currency = filters.currency.trim().toUpperCase();
      }
      const where = `WHERE ${conds.join(' AND ')}`;

      const query = `
        SELECT tc.category_guid AS category_guid,
          c.name AS category_name,
          c.index_number AS index_number,
          UPPER(TRIM(tc.currency)) AS currency,
          COUNT(*)::int AS count,
          COALESCE(SUM(tc.sale_price), 0)::numeric(14,2) AS sale,
          COALESCE(SUM(tc.net_price), 0)::numeric(14,2)  AS cost,
          COALESCE(SUM(tc.profit), 0)::numeric(14,2)     AS profit
        FROM tbl_total_calculations tc
        LEFT JOIN tbl_categories c ON c.guid = tc.category_guid
        ${where}
        GROUP BY tc.category_guid, c.name, c.index_number, UPPER(TRIM(tc.currency))
        ORDER BY sale DESC`;

      const rows: any[] = await this.sequelize.query<any>(query, { replacements: rp, type: QueryTypes.SELECT });

      const totalCountByCurrency = new Map<string, number>();
      for (const r of rows) {
        totalCountByCurrency.set(r.currency, (totalCountByCurrency.get(r.currency) || 0) + Number(r.count));
      }

      const marja = (profit: number, sale: number) => (sale === 0 ? 0 : r2((profit / sale) * 100));

      const data = rows.map((r) => {
        const totalCount = totalCountByCurrency.get(r.currency) || 0;
        const nameObj = typeof r.category_name === 'string' ? JSON.parse(r.category_name) : r.category_name;
        const sale = r2(r.sale);
        const profit = r2(r.profit);
        return {
          category_guid: r.category_guid,
          category_name: nameObj?.[lang] || nameObj?.tk || 'Näbelli',
          currency: r.currency,
          count: Number(r.count),
          percent: totalCount === 0 ? 0 : r2((Number(r.count) * 100) / totalCount),
          sale,
          cost: r2(r.cost),
          profit,
          marja: marja(profit, sale),
        };
      });

      const totals = new Map<string, { count: number; sale: number; cost: number; profit: number }>();
      for (const r of data) {
        const t = totals.get(r.currency) || { count: 0, sale: 0, cost: 0, profit: 0 };
        t.count += r.count;
        t.sale += r.sale;
        t.cost += r.cost;
        t.profit += r.profit;
        totals.set(r.currency, t);
      }
      const sum = Array.from(totals.entries()).map(([currency, t]) => ({
        currency,
        count: t.count,
        sale: r2(t.sale),
        cost: r2(t.cost),
        profit: r2(t.profit),
        marja: marja(t.profit, t.sale),
      }));

      return { status: 200, data, sum, message: 'Kategoriýa boýunça statistika üstünlikli alyndy' };
    } catch (e: any) {
      this.logger.error('getCategoryRating error:', e);
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Kategoriýa statistikasyny alyp bolmady', e);
    }
  }
}