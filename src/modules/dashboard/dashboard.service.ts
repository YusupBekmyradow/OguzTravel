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
const fmtDate = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

const parseJson = (v: any): any => {
  if (!v) return null;
  if (typeof v === 'object') return v;
  try { return JSON.parse(v); } catch { return { tk: v, ru: v, en: v }; }
};

const localized = (v: any, lang: string): string => {
  const o = parseJson(v);
  return o?.[lang] || o?.tk || 'Näbelli';
};

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
      buckets.push({ date: fmtDate(cursor), label: `${pad2(cursor.getMonth() + 1)}.${cursor.getFullYear()}` });
      cursor.setMonth(cursor.getMonth() + 1);
    }
  } else if (granularity === 'week') {
    const cursor = new Date(startObj.getFullYear(), startObj.getMonth(), startObj.getDate());
    const dayOfWeek = (cursor.getDay() + 6) % 7;
    cursor.setDate(cursor.getDate() - dayOfWeek);
    while (cursor <= endObj) {
      buckets.push({ date: fmtDate(cursor), label: `${pad2(cursor.getDate())}.${pad2(cursor.getMonth() + 1)}` });
      cursor.setDate(cursor.getDate() + 7);
    }
  } else {
    const cursor = new Date(startObj.getFullYear(), startObj.getMonth(), startObj.getDate());
    while (cursor <= endObj) {
      buckets.push({ date: fmtDate(cursor), label: `${pad2(cursor.getDate())}.${pad2(cursor.getMonth() + 1)}` });
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
          chart.push({ label: b.label, currency: cur, expense: r2(val.expense), income: r2(val.income), profit: r2(val.profit), credit: r2(val.credit) });
        }
      }

      return { status: 200, data: { cards, chart, granularity }, message: 'Dashboard maglumatlary üstünlikli alyndy' };
    } catch (e: any) {
      this.logger.error('getSummary error:', e);
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Dashboard maglumatlaryny alyp bolmady', e);
    }
  }



  
  async getOperatorsRating(filters: DashboardFilterDto, userPayload: any, lang = 'tk') {
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
          COALESCE(SUM(tc.profit), 0)::numeric(14,2)     AS profit,
          ROUND(
            COUNT(*) * 100.0 / NULLIF(SUM(COUNT(*)) OVER (PARTITION BY UPPER(TRIM(tc.currency))), 0),
            2
          ) AS percent
        FROM tbl_total_calculations tc
        LEFT JOIN tbl_employees e ON e.guid = tc.receiver_opr_guid
        ${where}
        GROUP BY 1, 2, 3
        ORDER BY sale DESC`;

      const rows: any[] = await this.sequelize.query<any>(query, { replacements: rp, type: QueryTypes.SELECT });

      const data = rows.map((r) => ({
        operator_guid: r.operator_guid,
        operator_name: r.operator_name || 'Näbelli',
        currency: r.currency,
        count: Number(r.count),
        percent: r2(r.percent),
        sale: r2(r.sale),
        profit: r2(r.profit),
      }));

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
          COALESCE(SUM(tc.profit), 0)::numeric(14,2)     AS profit,
          ROUND(
            CASE WHEN COALESCE(SUM(tc.sale_price), 0) = 0 THEN 0
            ELSE COALESCE(SUM(tc.profit), 0) * 100.0 / SUM(tc.sale_price) END,
            2
          ) AS marja,
          ROUND(
            COUNT(*) * 100.0 / NULLIF(SUM(COUNT(*)) OVER (PARTITION BY UPPER(TRIM(tc.currency))), 0),
            2
          ) AS percent,
          SUM(COUNT(*)) OVER (PARTITION BY UPPER(TRIM(tc.currency)))                                        AS total_count,
          SUM(COALESCE(SUM(tc.sale_price), 0)) OVER (PARTITION BY UPPER(TRIM(tc.currency)))::numeric(14,2)  AS total_sale,
          SUM(COALESCE(SUM(tc.net_price), 0)) OVER (PARTITION BY UPPER(TRIM(tc.currency)))::numeric(14,2)   AS total_cost,
          SUM(COALESCE(SUM(tc.profit), 0)) OVER (PARTITION BY UPPER(TRIM(tc.currency)))::numeric(14,2)      AS total_profit
        FROM tbl_total_calculations tc
        LEFT JOIN tbl_categories c ON c.guid = tc.category_guid
        ${where}
        GROUP BY 1, 2, 3, 4
        ORDER BY sale DESC`;

      const rows: any[] = await this.sequelize.query<any>(query, { replacements: rp, type: QueryTypes.SELECT });

      const data = rows.map((r) => ({
        category_guid: r.category_guid,
        category_name: localized(r.category_name, lang),
        currency: r.currency,
        count: Number(r.count),
        percent: r2(r.percent),
        sale: r2(r.sale),
        cost: r2(r.cost),
        profit: r2(r.profit),
        marja: r2(r.marja),
      }));

      const sumMap = new Map<string, { count: number; sale: number; cost: number; profit: number }>();
      for (const r of rows) {
        if (!sumMap.has(r.currency)) {
          sumMap.set(r.currency, {
            count: Number(r.total_count),
            sale: r2(r.total_sale),
            cost: r2(r.total_cost),
            profit: r2(r.total_profit),
          });
        }
      }
      const sum = Array.from(sumMap.entries()).map(([currency, t]) => ({
        currency,
        count: t.count,
        sale: t.sale,
        cost: t.cost,
        profit: t.profit,
        marja: t.sale === 0 ? 0 : r2((t.profit / t.sale) * 100),
      }));

      return { status: 200, data, sum, message: 'Kategoriýa boýunça statistika üstünlikli alyndy' };
    } catch (e: any) {
      this.logger.error('getCategoryRating error:', e);
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Kategoriýa statistikasyny alyp bolmady', e);
    }
  }




  async getOfficesRating(filters: DashboardFilterDto, userPayload: any, lang = 'tk') {
    try {
      const officeGuid = resolveOfficeGuid(filters, userPayload);
      const { startStr, endStr } = parseDates(filters);

      const rp: Record<string, any> = { startDate: startStr, endDate: endStr };
      const officeCond = officeGuid ? `AND tc.office_guid = :officeGuid` : '';
      if (officeGuid) rp.officeGuid = officeGuid;

      const query = `
        SELECT
          o.guid AS office_guid,
          o."fullName" AS office_name,
          o."shortName" AS office_short_name,
          COUNT(*)::int AS count,
          SUM(CASE WHEN UPPER(TRIM(tc.currency)) = 'USD' THEN tc.sale_price ELSE 0 END)::numeric(14,2) AS income_usd,
          SUM(CASE WHEN UPPER(TRIM(tc.currency)) = 'TMT' THEN tc.sale_price ELSE 0 END)::numeric(14,2) AS income_tmt,
          SUM(CASE WHEN UPPER(TRIM(tc.currency)) = 'USD' THEN tc.net_price ELSE 0 END)::numeric(14,2)  AS expense_usd,
          SUM(CASE WHEN UPPER(TRIM(tc.currency)) = 'TMT' THEN tc.net_price ELSE 0 END)::numeric(14,2)  AS expense_tmt,
          SUM(CASE WHEN UPPER(TRIM(tc.currency)) = 'USD' THEN tc.profit ELSE 0 END)::numeric(14,2)     AS profit_usd,
          SUM(CASE WHEN UPPER(TRIM(tc.currency)) = 'TMT' THEN tc.profit ELSE 0 END)::numeric(14,2)     AS profit_tmt,
          ROUND(
            SUM(CASE WHEN UPPER(TRIM(tc.currency)) = 'USD' THEN tc.sale_price ELSE 0 END) * 100.0
              / NULLIF(SUM(SUM(CASE WHEN UPPER(TRIM(tc.currency)) = 'USD' THEN tc.sale_price ELSE 0 END)) OVER (), 0),
            2
          ) AS percent
        FROM tbl_total_calculations tc
        JOIN tbl_offices o ON o.guid = tc.office_guid
        WHERE tc.office_guid IS NOT NULL
          AND tc.datetime >= :startDate AND tc.datetime <= :endDate
          ${officeCond}
        GROUP BY o.guid, o."fullName", o."shortName"
        ORDER BY income_usd DESC`;

      const rows: any[] = await this.sequelize.query<any>(query, { replacements: rp, type: QueryTypes.SELECT });

      const data = rows.map((r) => ({
        office_guid: r.office_guid,
        office_name: localized(r.office_name, lang),
        office_short_name: localized(r.office_short_name, lang),
        count: Number(r.count),
        percent: r2(r.percent),
        income: { USD: r2(r.income_usd), TMT: r2(r.income_tmt) },
        expense: { USD: r2(r.expense_usd), TMT: r2(r.expense_tmt) },
        profit: { USD: r2(r.profit_usd), TMT: r2(r.profit_tmt) },
      }));

      const jemi = data.reduce(
        (acc, o) => ({
          income: { USD: r2(acc.income.USD + o.income.USD), TMT: r2(acc.income.TMT + o.income.TMT) },
          expense: { USD: r2(acc.expense.USD + o.expense.USD), TMT: r2(acc.expense.TMT + o.expense.TMT) },
          profit: { USD: r2(acc.profit.USD + o.profit.USD), TMT: r2(acc.profit.TMT + o.profit.TMT) },
        }),
        { income: { USD: 0, TMT: 0 }, expense: { USD: 0, TMT: 0 }, profit: { USD: 0, TMT: 0 } },
      );

      return { status: 200, data, jemi, message: 'Ofisleriň netijesi üstünlikli alyndy' };
    } catch (e: any) {
      this.logger.error('getOfficesRating error:', e);
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Ofisleriň netijesini alyp bolmady', e);
    }
  }
}