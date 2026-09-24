import { Injectable, Logger } from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';
import { QueryTypes } from 'sequelize';
import { DashboardFilterDto, GetSummaryFilterDto } from './dto/dashboard-filter.dto';
import { UserType } from '../../enums/enums';
import { errorResponse } from '../../helpers/responseFunctions';
import { HttpStatuses } from '../../helpers/httpStatuses.enum';

type Granularity = 'day' | 'week' | 'month';

const pad2 = (n: number) => String(n).padStart(2, '0');
const r2 = (v: any) => Math.round((Number(v) || 0) * 100) / 100;
const pct = (cur: number, prev: number) =>
  prev === 0 ? (cur === 0 ? 0 : 100) : r2(((cur - prev) / Math.abs(prev)) * 100);
const marja = (profit: number, sale: number) => (sale === 0 ? 0 : r2((profit / sale) * 100));
const fmtDate = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

function parseDates(filters: DashboardFilterDto) {
  const now = new Date();
  const startStr = filters.start_date
    ? (filters.start_date.length === 10 ? `${filters.start_date} 00:00:00` : filters.start_date)
    : `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-01 00:00:00`;
  const endStr = filters.end_date
    ? (filters.end_date.length === 10 ? `${filters.end_date} 23:59:59.999` : filters.end_date)
    : now.toISOString();

  const startObj = new Date(startStr);
  const endObj = new Date(endStr);
  const diffDays = Math.max(1, Math.ceil((endObj.getTime() - startObj.getTime()) / (1000 * 60 * 60 * 24)));

  return { startStr, endStr, startObj, endObj, diffDays };
}

function resolveGranularity(filters: GetSummaryFilterDto, diffDays: number): Granularity {
  if (filters.group_by && ['day', 'week', 'month'].includes(filters.group_by)) {
    return filters.group_by;
  }
  return diffDays <= 35 ? 'day' : diffDays <= 125 ? 'week' : 'month';
}

function resolvePrevDates(startObj: Date, endObj: Date, granularity: Granularity) {
  if (granularity === 'month') {
    const pStart = new Date(startObj);
    pStart.setFullYear(pStart.getFullYear() - 1);
    const pEnd = new Date(endObj);
    pEnd.setFullYear(pEnd.getFullYear() - 1);
    return { prevStart: `${fmtDate(pStart)} 00:00:00`, prevEnd: `${fmtDate(pEnd)} 23:59:59.999` };
  }
  if (granularity === 'week') {
    const spanMs = endObj.getTime() - startObj.getTime();
    const pEnd = new Date(startObj.getTime() - 1);
    const pStart = new Date(pEnd.getTime() - spanMs);
    return { prevStart: `${fmtDate(pStart)} 00:00:00`, prevEnd: `${fmtDate(pEnd)} 23:59:59.999` };
  }
  const prev = new Date(startObj);
  prev.setDate(1);
  prev.setMonth(prev.getMonth() - 1);
  const pStart = new Date(prev.getFullYear(), prev.getMonth(), Math.min(startObj.getDate(), new Date(prev.getFullYear(), prev.getMonth() + 1, 0).getDate()));
  const pEnd = new Date(prev.getFullYear(), prev.getMonth(), Math.min(endObj.getDate(), new Date(prev.getFullYear(), prev.getMonth() + 1, 0).getDate()));
  return { prevStart: `${fmtDate(pStart)} 00:00:00`, prevEnd: `${fmtDate(pEnd)} 23:59:59.999` };
}

function resolveOfficeGuid(filters: DashboardFilterDto, userPayload: any): string | null {
  if (filters.office_guid) return filters.office_guid;
  const isAdmin = String(userPayload?.role || '').toLowerCase() === UserType.ADMIN.toLowerCase();
  return isAdmin ? null : (userPayload?.office_guid || null);
}

function buildWhere(
  startDate?: string | null,
  endDate?: string | null,
  officeGuid?: string | null,
  currency?: string | null,
  extraConds: string[] = [],
  prefix = '',
) {
  const conds = [...extraConds];
  const rp: Record<string, any> = {};

  if (startDate) {
    conds.push(`tc.datetime >= :${prefix}startDate`);
    rp[`${prefix}startDate`] = startDate;
  }
  if (endDate) {
    conds.push(`tc.datetime <= :${prefix}endDate`);
    rp[`${prefix}endDate`] = endDate;
  }
  if (officeGuid) {
    conds.push(`tc.office_guid = :${prefix}officeGuid`);
    rp[`${prefix}officeGuid`] = officeGuid;
  }
  if (currency?.trim()) {
    conds.push(`UPPER(TRIM(tc.currency)) = :${prefix}currency`);
    rp[`${prefix}currency`] = currency.trim().toUpperCase();
  }

  return { where: conds.length ? `WHERE ${conds.join(' AND ')}` : '', rp };
}

function buildChartBuckets(startObj: Date, endObj: Date, granularity: Granularity) {
  const buckets: { date: string; label: string }[] = [];

  if (granularity === 'month') {
    const cursor = new Date(startObj.getFullYear(), startObj.getMonth(), 1);
    while (cursor <= endObj) {
      buckets.push({
        date: fmtDate(cursor),
        label: `${pad2(cursor.getMonth() + 1)}.${cursor.getFullYear()}`,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
  } else if (granularity === 'week') {
    const cursor = new Date(startObj.getFullYear(), startObj.getMonth(), startObj.getDate());
    const dayOfWeek = (cursor.getDay() + 6) % 7;
    cursor.setDate(cursor.getDate() - dayOfWeek);
    while (cursor <= endObj) {
      buckets.push({
        date: fmtDate(cursor),
        label: `${pad2(cursor.getDate())}.${pad2(cursor.getMonth() + 1)}`,
      });
      cursor.setDate(cursor.getDate() + 7);
    }
  } else {
    const cursor = new Date(startObj.getFullYear(), startObj.getMonth(), startObj.getDate());
    while (cursor <= endObj) {
      buckets.push({
        date: fmtDate(cursor),
        label: `${pad2(cursor.getDate())}.${pad2(cursor.getMonth() + 1)}`,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  return buckets;
}

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(private readonly sequelize: Sequelize) { }


  
  async getSummary(filters: GetSummaryFilterDto, userPayload: any, lang = 'tk') {
    try {
      const officeGuid = resolveOfficeGuid(filters, userPayload);
      const { startStr, endStr, startObj, endObj, diffDays } = parseDates(filters);
      const granularity = resolveGranularity(filters, diffDays);
      const { prevStart, prevEnd } = resolvePrevDates(startObj, endObj, granularity);

      const { where: curWhere, rp: curRp } = buildWhere(startStr, endStr, officeGuid, filters.currency);
      const { where: prevWhere, rp: prevRp } = buildWhere(prevStart, prevEnd, officeGuid, filters.currency, [], 'p_');

      const sumSql = (where: string) => `
        SELECT UPPER(TRIM(tc.currency)) AS currency,
          COALESCE(SUM(tc.net_price), 0)::numeric(14,2)    AS expense,
          COALESCE(SUM(tc.sale_price), 0)::numeric(14,2)   AS income,
          COALESCE(SUM(tc.profit), 0)::numeric(14,2)       AS profit,
          COALESCE(SUM(tc.credit_price), 0)::numeric(14,2) AS credit
        FROM tbl_total_calculations tc ${where}
        GROUP BY 1`;

      const chartSql = `
        SELECT TO_CHAR(DATE_TRUNC('${granularity}', tc.datetime), 'YYYY-MM-DD') AS date,
          UPPER(TRIM(tc.currency)) AS currency,
          COALESCE(SUM(tc.net_price), 0)::numeric(14,2)    AS expense,
          COALESCE(SUM(tc.sale_price), 0)::numeric(14,2)   AS income,
          COALESCE(SUM(tc.profit), 0)::numeric(14,2)       AS profit,
          COALESCE(SUM(tc.credit_price), 0)::numeric(14,2) AS credit
        FROM tbl_total_calculations tc ${curWhere}
        GROUP BY 1, 2
        ORDER BY 1 ASC`;

      const [curRows, prevRows, chartRows]: [any[], any[], any[]] = await Promise.all([
        this.sequelize.query<any>(sumSql(curWhere), { replacements: curRp, type: QueryTypes.SELECT }),
        this.sequelize.query<any>(sumSql(prevWhere), { replacements: prevRp, type: QueryTypes.SELECT }),
        this.sequelize.query<any>(chartSql, { replacements: curRp, type: QueryTypes.SELECT }),
      ]);

      const toMap = (rows: any[]) =>
        new Map(rows.map((r) => [r.currency, { expense: r2(r.expense), income: r2(r.income), profit: r2(r.profit), credit: r2(r.credit) }]));
      const curMap = toMap(curRows);
      const prevMap = toMap(prevRows);
      const zero = { expense: 0, income: 0, profit: 0, credit: 0 };

      const card = (f: 'expense' | 'income' | 'credit' | 'profit', cur: string) => {
        const total = (curMap.get(cur) || zero)[f];
        const previous = (prevMap.get(cur) || zero)[f];
        return { total, previous, change_amount: r2(total - previous), change_percent: pct(total, previous) };
      };

      const cards = Object.fromEntries(
        (['expense', 'income', 'credit', 'profit'] as const).map((f) => [f, { USD: card(f, 'USD'), TMT: card(f, 'TMT') }])
      );

      const chartMap = new Map(chartRows.map((r) => [`${r.date}_${r.currency}`, r]));
      const buckets = buildChartBuckets(startObj, endObj, granularity);
      const currencies = filters.currency?.trim() ? [filters.currency.trim().toUpperCase()] : ['USD', 'TMT'];

      const chart: any[] = [];
      for (const b of buckets) {
        for (const cur of currencies) {
          const val = chartMap.get(`${b.date}_${cur}`) || zero;
          chart.push({
            label: b.label,
            currency: cur,
            expense: r2(val.expense),
            income: r2(val.income),
            profit: r2(val.profit),
            credit: r2(val.credit),
          });
        }
      }

      return {
        status: 200,
        data: { cards, chart, granularity },
        message: 'Dashboard maglumatlary üstünlikli alyndy',
      };
    } catch (e: any) {
      this.logger.error('getSummary error:', e);
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Dashboard maglumatlaryny alyp bolmady', e);
    }
  }




  async getOperatorsRating(filters: DashboardFilterDto, userPayload: any) {
    try {
      const officeGuid = resolveOfficeGuid(filters, userPayload);
      const { startStr, endStr } = filters.start_date || filters.end_date ? parseDates(filters) : { startStr: null, endStr: null };
      const { where, rp } = buildWhere(startStr, endStr, officeGuid, filters.currency, ['tc.receiver_opr_guid IS NOT NULL']);

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
        GROUP BY 1, 2, 3
        ORDER BY sale DESC`;

      const rows: any[] = await this.sequelize.query<any>(query, { replacements: rp, type: QueryTypes.SELECT });

      const totalByCurrency = new Map<string, number>();
      for (const r of rows) {
        totalByCurrency.set(r.currency, (totalByCurrency.get(r.currency) || 0) + Number(r.count));
      }

      const data = rows.map((r) => {
        const total = totalByCurrency.get(r.currency) || 0;
        return {
          operator_guid: r.operator_guid,
          operator_name: r.operator_name || 'Näbelli',
          currency: r.currency,
          count: Number(r.count),
          percent: total === 0 ? 0 : r2((Number(r.count) * 100) / total),
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
      const officeGuid = resolveOfficeGuid(filters, userPayload);
      const { startStr, endStr } = filters.start_date || filters.end_date ? parseDates(filters) : { startStr: null, endStr: null };
      const { where, rp } = buildWhere(startStr, endStr, officeGuid, filters.currency, ['tc.category_guid IS NOT NULL']);

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
        GROUP BY 1, 2, 3, 4
        ORDER BY sale DESC`;

      const rows: any[] = await this.sequelize.query<any>(query, { replacements: rp, type: QueryTypes.SELECT });

      const totalByCur = new Map<string, number>();
      for (const r of rows) {
        totalByCur.set(r.currency, (totalByCur.get(r.currency) || 0) + Number(r.count));
      }

      const totals = new Map<string, { count: number; sale: number; cost: number; profit: number }>();

      const data = rows.map((r) => {
        const total = totalByCur.get(r.currency) || 0;
        const nameObj = typeof r.category_name === 'string' ? JSON.parse(r.category_name) : r.category_name;
        const sale = r2(r.sale);
        const cost = r2(r.cost);
        const profit = r2(r.profit);

        const curTotals = totals.get(r.currency) || { count: 0, sale: 0, cost: 0, profit: 0 };
        curTotals.count += Number(r.count);
        curTotals.sale += sale;
        curTotals.cost += cost;
        curTotals.profit += profit;
        totals.set(r.currency, curTotals);

        return {
          category_guid: r.category_guid,
          category_name: nameObj?.[lang] || nameObj?.tk || 'Näbelli',
          currency: r.currency,
          count: Number(r.count),
          percent: total === 0 ? 0 : r2((Number(r.count) * 100) / total),
          sale,
          cost,
          profit,
          marja: marja(profit, sale),
        };
      });

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