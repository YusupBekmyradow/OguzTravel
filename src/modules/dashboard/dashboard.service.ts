import { Injectable, Logger } from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';
import { QueryTypes } from 'sequelize';
import { DashboardFilterDto, GetSummaryFilterDto } from './dto/dashboard-filter.dto';
import { UserType } from '../../enums/enums';
import { errorResponse, successResponse } from '../../helpers/responseFunctions';
import { HttpStatuses } from '../../helpers/httpStatuses.enum';
import { SYSTEM_CATEGORIES } from '../total_calculations/total_calculations.service';

type Granularity = 'day' | 'week' | 'month';

/**
 * Business timezone. Date filters ("2026-09-01") and chart buckets are local
 * calendar days here, so a sale at 01:00 Ashgabat time is not pushed into the
 * previous day by the UTC database session.
 */
const TZ = process.env.DASHBOARD_TZ || 'Asia/Ashgabat';
const CURRENCIES = ['USD', 'TMT'];

/**
 * Dashboard module cards → tbl_categories guids (see SYSTEM_CATEGORIES).
 * Turkish Airlines has no sync trigger into tbl_total_calculations yet, so its
 * card stays empty until it gets one.
 */
const MODULES: { key: string; categories: string[] }[] = [
  { key: 'b2b', categories: [SYSTEM_CATEGORIES.B2B] },
  { key: 'thy', categories: [] },
  {
    key: 'outbound',
    categories: [
      SYSTEM_CATEGORIES.AIRWAY,
      SYSTEM_CATEGORIES.RAILWAY,
      SYSTEM_CATEGORIES.HOTEL,
      SYSTEM_CATEGORIES.TOUR,
      SYSTEM_CATEGORIES.TRANSFER,
      SYSTEM_CATEGORIES.PACKAGE,
    ],
  },
  { key: 'visa', categories: [SYSTEM_CATEGORIES.VISA] },
  { key: 'translation', categories: [SYSTEM_CATEGORIES.TRANSLATION] },
  { key: 'referral', categories: [SYSTEM_CATEGORIES.REFERRAL_LETTER] },
  { key: 'cafeteria', categories: [SYSTEM_CATEGORIES.CAFETERIA] },
];
const MODULE_OF = new Map(MODULES.flatMap((m) => m.categories.map((c) => [c, m.key] as [string, string])));

/**
 * What counts as a sale on the dashboard: rows synced from a sales module by
 * DB triggers. Not sales: cash-book / Excel rows (is_manual), salaries
 * (synced too, but an expense) and cafe expenses (type=false rows, which the
 * trigger writes with sale_price 0). The guids are code constants.
 */
const SALE_CATEGORIES = MODULES.flatMap((m) => m.categories).map((g) => `'${g}'`).join(', ');
const SALES_COND = `(tc.is_manual = FALSE
  AND tc.category_guid IN (${SALE_CATEGORIES})
  AND NOT (tc.category_guid = '${SYSTEM_CATEGORIES.CAFETERIA}' AND COALESCE(tc.sale_price, 0) = 0))`;
const NOT_REFUND = `UPPER(COALESCE(tc.status, '')) <> 'REFUND'`;
/** Unpaid remainder of a sale; credit_price holds the unpaid remaining balance. */
const UNPAID = `COALESCE(tc.credit_price, 0)`;
const RECEIVABLE = `CASE WHEN LOWER(COALESCE(tc.status, '')) = 'notpaid' THEN ${UNPAID} ELSE 0 END`;
const CURRENCY = `UPPER(TRIM(tc.currency))`;
/** USD amounts stored in dual-currency rows (e.g. Visa). Always go to USD bucket. */
const USD_SALE = `COALESCE(tc.sale_price_usd, 0)`;
const USD_CREDIT = `COALESCE(tc.credit_usd, 0)`;

const pad2 = (n: number) => String(n).padStart(2, '0');
const r2 = (v: any) => Math.round((Number(v) || 0) * 100) / 100;
const pct = (cur: number, prev: number) =>
  prev === 0 ? (cur === 0 ? 0 : 100) : r2(((cur - prev) / Math.abs(prev)) * 100);

const parseJson = (v: any): any => {
  if (!v) return null;
  if (typeof v === 'object') return v;
  try { return JSON.parse(v); } catch { return { tk: v, ru: v, en: v }; }
};

const localized = (v: any, lang: string): string => {
  const o = parseJson(v);
  return o?.[lang] || o?.tk || 'Näbelli';
};

// ---- Calendar dates ("YYYY-MM-DD"), computed in UTC so the server TZ never shifts them ----

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const toDay = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};
const fmtDay = (d: Date) => `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
const addDays = (s: string, n: number) => {
  const d = toDay(s);
  d.setUTCDate(d.getUTCDate() + n);
  return fmtDay(d);
};
const daysBetween = (a: string, b: string) => Math.round((toDay(b).getTime() - toDay(a).getTime()) / 86400000);
const todayLocal = () => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());

/** Accepts "YYYY-MM-DD" (or a longer ISO string, cut to its date part). */
const dateOnly = (v?: string | null) => {
  const s = (v || '').trim().slice(0, 10);
  return DATE_RE.test(s) ? s : null;
};

type Range = { start: string; end: string };

/** Current range: defaults to the 1st of this month … today. */
function resolveRange(filters: DashboardFilterDto): Range | null {
  const today = todayLocal();
  const start = filters.start_date ? dateOnly(filters.start_date) : `${today.slice(0, 8)}01`;
  const end = filters.end_date ? dateOnly(filters.end_date) : today;
  if (!start || !end || start > end) return null;
  return { start, end };
}

/** Previous range: the one the client sends, else the equally long span right before. */
function resolvePrevRange(filters: GetSummaryFilterDto, cur: Range): Range | null {
  if (filters.prev_start_date || filters.prev_end_date) {
    const start = dateOnly(filters.prev_start_date);
    const end = dateOnly(filters.prev_end_date);
    if (!start || !end || start > end) return null;
    return { start, end };
  }
  const len = daysBetween(cur.start, cur.end);
  const end = addDays(cur.start, -1);
  return { start: addDays(end, -len), end };
}

function resolveGranularity(filters: GetSummaryFilterDto, cur: Range): Granularity {
  if (filters.group_by) return filters.group_by;
  const days = daysBetween(cur.start, cur.end) + 1;
  return days <= 45 ? 'day' : days <= 180 ? 'week' : 'month';
}

/** Bucket start dates covering the range (weeks start on Monday, like DATE_TRUNC). */
function buildBuckets(range: Range, granularity: Granularity) {
  const buckets: { key: string; label: string }[] = [];
  const cursor = toDay(range.start);
  if (granularity === 'month') cursor.setUTCDate(1);
  if (granularity === 'week') cursor.setUTCDate(cursor.getUTCDate() - ((cursor.getUTCDay() + 6) % 7));
  const end = toDay(range.end);
  while (cursor <= end) {
    const key = fmtDay(cursor);
    const label = granularity === 'month'
      ? `${pad2(cursor.getUTCMonth() + 1)}.${cursor.getUTCFullYear()}`
      : `${pad2(cursor.getUTCDate())}.${pad2(cursor.getUTCMonth() + 1)}`;
    buckets.push({ key, label });
    if (granularity === 'month') cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    else cursor.setUTCDate(cursor.getUTCDate() + (granularity === 'week' ? 7 : 1));
  }
  return buckets;
}

/**
 * `tc.datetime` within [start 00:00, end + 1 day 00:00) local time. The bounds
 * are converted once, so the datetime index is still used.
 */
function rangeCond(range: Range, prefix: string, rp: Record<string, any>) {
  rp[`${prefix}From`] = `${range.start} 00:00:00`;
  rp[`${prefix}To`] = `${addDays(range.end, 1)} 00:00:00`;
  rp.tz = TZ;
  return `(tc.datetime >= (CAST(:${prefix}From AS timestamp) AT TIME ZONE :tz)
    AND tc.datetime < (CAST(:${prefix}To AS timestamp) AT TIME ZONE :tz))`;
}

/** Shared WHERE parts: project sales, office and optional currency. */
function baseConds(officeGuid: string | null, currency: string | undefined, rp: Record<string, any>) {
  const conds = [SALES_COND];
  if (officeGuid) {
    conds.push('tc.office_guid = :officeGuid');
    rp.officeGuid = officeGuid;
  }
  if (currency?.trim()) {
    conds.push(`${CURRENCY} = :currency`);
    rp.currency = currency.trim().toUpperCase();
  }
  return conds;
}

const emptyTotals = () => ({ count: 0, revenue: 0, cost: 0, profit: 0, receivable: 0, refunds: 0, refund_amount: 0 });
type Totals = ReturnType<typeof emptyTotals>;
const roundTotals = (t: Totals): Totals =>
  Object.fromEntries(Object.entries(t).map(([k, v]) => [k, k === 'count' || k === 'refunds' ? v : r2(v)])) as Totals;

const invalidRange = () => errorResponse(HttpStatuses.BAD_REQUEST, 'Sene aralygy nädogry');
const noOffice = () => errorResponse(HttpStatuses.FORBIDDEN, 'Ulanyjy hiç bir ofise degişli däl');

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(private readonly sequelize: Sequelize) { }

  /**
   * Admins see every office (or the one they pick). Everyone else only ever
   * sees their own office, looked up from their employee record; the JWT does
   * not carry it. `undefined` = user has no office (no access).
   */
  private async resolveOfficeGuid(filters: DashboardFilterDto, userPayload: any): Promise<string | null | undefined> {
    const isAdmin = String(userPayload?.role || '').toLowerCase() === UserType.ADMIN.toLowerCase();
    if (isAdmin) return filters.office_guid || null;
    if (!userPayload?.guid) return undefined;
    const [row] = await this.select<{ office_guid: string | null }>(
      `SELECT e.office_guid FROM tbl_users u JOIN tbl_employees e ON e.guid = u.employee_guid WHERE u.guid = :guid LIMIT 1`,
      { guid: userPayload.guid },
    );
    return row?.office_guid || undefined;
  }

  private select<T extends object = any>(sql: string, replacements: Record<string, any>): Promise<T[]> {
    return this.sequelize.query<T>(sql, { replacements, type: QueryTypes.SELECT });
  }

  /**
   * Everything the sales dashboard shows, per currency, in one request:
   * totals for the current and previous range, chart buckets, payment status
   * split, and per-module totals / chart / top operators.
   *
   * Rules: USD and TMT are never added together. Refunds are left out of
   * sales, profit and counts (reported separately). Receivable = sale − paid,
   * only for sales still marked "notpaid".
   */
  async getSummary(filters: GetSummaryFilterDto, userPayload: any, lang = 'tk') {
    try {
      const cur = resolveRange(filters);
      if (!cur) return invalidRange();
      const prev = resolvePrevRange(filters, cur);
      if (!prev) return invalidRange();
      const granularity = resolveGranularity(filters, cur);
      const officeGuid = await this.resolveOfficeGuid(filters, userPayload);
      if (officeGuid === undefined) return noOffice();
      const currencies = filters.currency?.trim() ? [filters.currency.trim().toUpperCase()] : CURRENCIES;

      const rp: Record<string, any> = { granularity };
      const conds = baseConds(officeGuid, filters.currency, rp);
      const curCond = rangeCond(cur, 'cur', rp);
      const prevCond = rangeCond(prev, 'prev', rp);
      const where = `WHERE ${conds.join(' AND ')} AND (${curCond} OR ${prevCond})`;
      const period = `CASE WHEN ${curCond} THEN 'cur' ELSE 'prev' END`;

      const [totalRows, bucketRows, operatorRows] = await Promise.all([
        // Totals per period × currency × category × status (a few hundred rows at most).
        // Extra USD amounts (sale_price_usd, credit_usd) are injected as synthetic 'USD' rows.
        this.select(`
          SELECT ${period} AS period, ${CURRENCY} AS currency, tc.category_guid,
            LOWER(COALESCE(tc.status, '')) AS status,
            COUNT(*)::int AS count,
            COALESCE(SUM(tc.sale_price), 0) AS sale,
            COALESCE(SUM(tc.net_price), 0) AS cost,
            COALESCE(SUM(tc.profit), 0) AS profit,
            COALESCE(SUM(${UNPAID}), 0) AS unpaid
          FROM tbl_total_calculations tc
          ${where}
          GROUP BY 1, 2, 3, 4
          UNION ALL
          SELECT ${period}, 'USD', tc.category_guid,
            LOWER(COALESCE(tc.status, '')),
            0,
            COALESCE(SUM(${USD_SALE}), 0),
            0, 0, 0
          FROM tbl_total_calculations tc
          ${where}
          GROUP BY 1, tc.category_guid, LOWER(COALESCE(tc.status, ''))
          HAVING COALESCE(SUM(${USD_SALE}), 0) > 0`, rp),
        // Chart buckets per period × currency × category, refunds excluded.
        this.select(`
          SELECT ${period} AS period,
            TO_CHAR(DATE_TRUNC(:granularity, tc.datetime AT TIME ZONE :tz), 'YYYY-MM-DD') AS bucket,
            ${CURRENCY} AS currency, tc.category_guid,
            COUNT(*)::int AS count,
            COALESCE(SUM(tc.sale_price), 0) AS sale,
            COALESCE(SUM(tc.profit), 0) AS profit,
            COALESCE(SUM(${RECEIVABLE}), 0) AS receivable
          FROM tbl_total_calculations tc
          ${where} AND ${NOT_REFUND}
          GROUP BY 1, 2, 3, 4
          UNION ALL
          SELECT ${period},
            TO_CHAR(DATE_TRUNC(:granularity, tc.datetime AT TIME ZONE :tz), 'YYYY-MM-DD'),
            'USD', tc.category_guid, 0,
            COALESCE(SUM(${USD_SALE}), 0), 0, 0
          FROM tbl_total_calculations tc
          ${where} AND ${NOT_REFUND}
          GROUP BY 1, 2, tc.category_guid
          HAVING COALESCE(SUM(${USD_SALE}), 0) > 0`, rp),
        // Operators per currency × category in the current range.
        this.select(`
          SELECT ${CURRENCY} AS currency, tc.category_guid, tc.receiver_opr_guid AS guid,
            e."fullName" AS name,
            COUNT(*)::int AS count,
            COALESCE(SUM(tc.sale_price), 0) AS sale
          FROM tbl_total_calculations tc
          LEFT JOIN tbl_employees e ON e.guid = tc.receiver_opr_guid
          WHERE ${conds.join(' AND ')} AND ${curCond} AND ${NOT_REFUND}
            AND tc.receiver_opr_guid IS NOT NULL
          GROUP BY 1, 2, 3, 4
          UNION ALL
          SELECT 'USD', tc.category_guid, tc.receiver_opr_guid, e."fullName", 0,
            COALESCE(SUM(${USD_SALE}), 0)
          FROM tbl_total_calculations tc
          LEFT JOIN tbl_employees e ON e.guid = tc.receiver_opr_guid
          WHERE ${conds.join(' AND ')} AND ${curCond} AND ${NOT_REFUND}
            AND tc.receiver_opr_guid IS NOT NULL
          GROUP BY tc.category_guid, tc.receiver_opr_guid, e."fullName"
          HAVING COALESCE(SUM(${USD_SALE}), 0) > 0`, rp),
      ]);

      const curBuckets = buildBuckets(cur, granularity);
      const prevBuckets = buildBuckets(prev, granularity);
      const curIndex = new Map(curBuckets.map((b, i) => [b.key, i]));
      const prevIndex = new Map(prevBuckets.map((b, i) => [b.key, i]));

      const byCurrency = Object.fromEntries(currencies.map((c) => {
        const newBuckets = () => curBuckets.map((b) => ({ ...b, count: 0, revenue: 0, profit: 0, receivable: 0 }));
        return [c, {
          current: emptyTotals(),
          previous: emptyTotals(),
          buckets: newBuckets(),
          payment: { PAID: { count: 0, amount: 0 }, NOTPAID: { count: 0, amount: 0 }, REFUND: { count: 0, amount: 0 }, NONE: { count: 0, amount: 0 } },
          modules: new Map(MODULES.map((m) => [m.key, {
            key: m.key,
            current: emptyTotals(),
            previous: emptyTotals(),
            buckets: newBuckets(),
            prev_revenue: curBuckets.map(() => null as number | null),
            operators: [] as { guid: string; name: string; revenue: number; count: number }[],
          }])),
        }];
      }));

      for (const r of totalRows) {
        const c = byCurrency[r.currency];
        if (!c) continue;
        const mod = c.modules.get(MODULE_OF.get(r.category_guid) || '');
        const targets = [r.period === 'cur' ? c.current : c.previous];
        if (mod) targets.push(r.period === 'cur' ? mod.current : mod.previous);
        const sale = Number(r.sale) || 0;
        for (const t of targets) {
          if (r.status === 'refund') {
            t.refunds += r.count;
            t.refund_amount += sale;
            continue;
          }
          t.count += r.count;
          t.revenue += sale;
          t.cost += Number(r.cost) || 0;
          t.profit += Number(r.profit) || 0;
          if (r.status === 'notpaid') t.receivable += Number(r.unpaid) || 0;
        }
        if (r.period === 'cur') {
          const key = r.status === 'paid' ? 'PAID' : r.status === 'notpaid' ? 'NOTPAID' : r.status === 'refund' ? 'REFUND' : 'NONE';
          c.payment[key].count += r.count;
          c.payment[key].amount += sale;
        }
      }

      for (const r of bucketRows) {
        const c = byCurrency[r.currency];
        if (!c) continue;
        const mod = c.modules.get(MODULE_OF.get(r.category_guid) || '');
        const sale = Number(r.sale) || 0;
        if (r.period === 'prev') {
          // Previous-period values line up with the current buckets by position.
          const i = prevIndex.get(r.bucket);
          if (mod && i != null && i < curBuckets.length) mod.prev_revenue[i] = (mod.prev_revenue[i] || 0) + sale;
          continue;
        }
        const i = curIndex.get(r.bucket);
        if (i == null) continue;
        for (const b of [c.buckets[i], mod?.buckets[i]]) {
          if (!b) continue;
          b.count += r.count;
          b.revenue += sale;
          b.profit += Number(r.profit) || 0;
          b.receivable += Number(r.receivable) || 0;
        }
      }

      for (const r of operatorRows) {
        const mod = byCurrency[r.currency]?.modules.get(MODULE_OF.get(r.category_guid) || '');
        if (!mod) continue;
        const existing = mod.operators.find((o) => o.guid === r.guid);
        if (existing) {
          existing.revenue += Number(r.sale) || 0;
          existing.count += r.count;
        } else {
          mod.operators.push({ guid: r.guid, name: r.name || 'Näbelli', revenue: Number(r.sale) || 0, count: r.count });
        }
      }

      const roundBucket = (b: any) => ({ ...b, revenue: r2(b.revenue), profit: r2(b.profit), receivable: r2(b.receivable) });
      const result = Object.fromEntries(Object.entries(byCurrency).map(([c, v]) => [c, {
        current: roundTotals(v.current),
        previous: roundTotals(v.previous),
        buckets: v.buckets.map(roundBucket),
        payment: Object.fromEntries(Object.entries(v.payment).map(([k, p]) => [k, { count: p.count, amount: r2(p.amount) }])),
        modules: [...v.modules.values()].map((m) => {
          // Positions without previous data stay null (a gap), unless the
          // module had previous sales at all, then they are real zeros.
          const hasPrev = m.previous.count > 0;
          return {
            key: m.key,
            current: roundTotals(m.current),
            previous: roundTotals(m.previous),
            buckets: m.buckets.map(roundBucket),
            prev_revenue: m.prev_revenue.map((val, i) =>
              val != null ? r2(val) : hasPrev && i < prevBuckets.length ? 0 : null),
            operators: m.operators
              .sort((a, b) => b.revenue - a.revenue)
              .slice(0, 5)
              .map((o) => ({ ...o, revenue: r2(o.revenue) })),
          };
        }),
      }]));

      // Older card/chart shape, kept for existing API clients. `credit` is the receivable.
      const cards = Object.fromEntries(([
        ['expense', 'cost'], ['income', 'revenue'], ['credit', 'receivable'], ['profit', 'profit'],
      ] as const).map(([name, field]) => [name, Object.fromEntries(currencies.map((c) => {
        const total = result[c].current[field];
        const previous = result[c].previous[field];
        return [c, { total, previous, change_amount: r2(total - previous), change_percent: pct(total, previous) }];
      }))]));

      return {
        status: 200,
        data: {
          granularity,
          range: { start: cur.start, end: cur.end, prev_start: prev.start, prev_end: prev.end },
          currencies: result,
          cards,
        },
        message: 'Dashboard maglumatlary üstünlikli alyndy',
      };
    } catch (e: any) {
      this.logger.error('getSummary error:', e);
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Dashboard maglumatlaryny alyp bolmady', e);
    }
  }

  /** Optional date range: without start/end dates the whole history is used. */
  private optionalRange(filters: DashboardFilterDto, rp: Record<string, any>): string | null | false {
    if (!filters.start_date && !filters.end_date) return null;
    const range = resolveRange(filters);
    return range ? rangeCond(range, 'cur', rp) : false;
  }

  async getOperatorsRating(filters: DashboardFilterDto, userPayload: any) {
    try {
      const rp: Record<string, any> = {};
      const officeGuid = await this.resolveOfficeGuid(filters, userPayload);
      if (officeGuid === undefined) return noOffice();
      const conds = baseConds(officeGuid, filters.currency, rp);
      const range = this.optionalRange(filters, rp);
      if (range === false) return invalidRange();
      if (range) conds.push(range);
      conds.push(NOT_REFUND, 'tc.receiver_opr_guid IS NOT NULL');

      const rows = await this.select(`
        WITH raw AS (
          SELECT tc.receiver_opr_guid AS operator_guid,
            e."fullName" AS operator_name,
            ${CURRENCY} AS currency,
            COUNT(*)::int AS cnt,
            COALESCE(SUM(tc.sale_price), 0)::numeric(14,2) AS sale,
            COALESCE(SUM(tc.profit), 0)::numeric(14,2) AS profit
          FROM tbl_total_calculations tc
          LEFT JOIN tbl_employees e ON e.guid = tc.receiver_opr_guid
          WHERE ${conds.join(' AND ')}
          GROUP BY 1, 2, 3
          UNION ALL
          SELECT tc.receiver_opr_guid, e."fullName", 'USD'::text, 0,
            COALESCE(SUM(${USD_SALE}), 0)::numeric(14,2), 0
          FROM tbl_total_calculations tc
          LEFT JOIN tbl_employees e ON e.guid = tc.receiver_opr_guid
          WHERE ${conds.join(' AND ')}
          GROUP BY 1, 2
          HAVING COALESCE(SUM(${USD_SALE}), 0) > 0
        )
        SELECT operator_guid, operator_name, currency,
          SUM(cnt)::int AS count,
          SUM(sale)::numeric(14,2) AS sale,
          SUM(profit)::numeric(14,2) AS profit
        FROM raw
        GROUP BY 1, 2, 3
        ORDER BY sale DESC`, rp);

      // Recompute percent in JS after aggregation (SQL window fn not used anymore)
      const currencyTotals = new Map<string, number>();
      for (const r of rows) {
        currencyTotals.set(r.currency, (currencyTotals.get(r.currency) || 0) + Number(r.count || 0));
      }
      const data = rows.map((r) => ({
        operator_guid: r.operator_guid,
        operator_name: r.operator_name || 'Näbelli',
        currency: r.currency,
        count: Number(r.count),
        percent: r2((Number(r.count) * 100) / (currencyTotals.get(r.currency) || 1)),
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
      const rp: Record<string, any> = {};
      const officeGuid = await this.resolveOfficeGuid(filters, userPayload);
      if (officeGuid === undefined) return noOffice();
      const conds = baseConds(officeGuid, filters.currency, rp);
      const range = this.optionalRange(filters, rp);
      if (range === false) return invalidRange();
      if (range) conds.push(range);
      conds.push(NOT_REFUND, 'tc.category_guid IS NOT NULL');

      const rows = await this.select(`
        WITH raw AS (
          SELECT tc.category_guid, c.name AS category_name, ${CURRENCY} AS currency,
            COUNT(*)::int AS cnt,
            COALESCE(SUM(tc.sale_price), 0)::numeric(14,2) AS sale,
            COALESCE(SUM(tc.net_price), 0)::numeric(14,2)  AS cost,
            COALESCE(SUM(tc.profit), 0)::numeric(14,2)     AS profit
          FROM tbl_total_calculations tc
          LEFT JOIN tbl_categories c ON c.guid = tc.category_guid
          WHERE ${conds.join(' AND ')}
          GROUP BY 1, 2, 3
          UNION ALL
          SELECT tc.category_guid, c.name, 'USD'::text, 0,
            COALESCE(SUM(${USD_SALE}), 0)::numeric(14,2), 0, 0
          FROM tbl_total_calculations tc
          LEFT JOIN tbl_categories c ON c.guid = tc.category_guid
          WHERE ${conds.join(' AND ')}
          GROUP BY 1, 2
          HAVING COALESCE(SUM(${USD_SALE}), 0) > 0
        )
        SELECT category_guid, category_name, currency,
          SUM(cnt)::int AS count,
          SUM(sale)::numeric(14,2) AS sale,
          SUM(cost)::numeric(14,2) AS cost,
          SUM(profit)::numeric(14,2) AS profit
        FROM raw
        GROUP BY 1, 2, 3
        ORDER BY sale DESC`, rp);

      // Recompute per-currency totals in JS (window fns removed due to UNION ALL)
      const catTotals = new Map<string, { count: number; sale: number; cost: number; profit: number }>();
      for (const r of rows) {
        const t = catTotals.get(r.currency) || { count: 0, sale: 0, cost: 0, profit: 0 };
        t.count += Number(r.count);
        t.sale = r2(t.sale + Number(r.sale));
        t.cost = r2(t.cost + Number(r.cost));
        t.profit = r2(t.profit + Number(r.profit));
        catTotals.set(r.currency, t);
      }

      const data = rows.map((r) => {
        const tot = catTotals.get(r.currency) || { count: 1, sale: 0, cost: 0, profit: 0 };
        const sale = Number(r.sale);
        return {
          category_guid: r.category_guid,
          category_name: localized(r.category_name, lang),
          currency: r.currency,
          count: Number(r.count),
          percent: r2((Number(r.count) * 100) / (tot.count || 1)),
          sale: r2(sale),
          cost: r2(r.cost),
          profit: r2(r.profit),
          marja: sale === 0 ? 0 : r2((Number(r.profit) * 100) / sale),
        };
      });

      const sumMap = catTotals;
      const sum = [...sumMap.entries()].map(([currency, t]) => ({
        currency,
        count: t.count,
        sale: r2(t.sale),
        cost: r2(t.cost),
        profit: r2(t.profit),
        marja: t.sale === 0 ? 0 : r2((t.profit / t.sale) * 100),
      }));

      return { status: 200, data, sum, message: 'Kategoriýa boýunça statistika üstünlikli alyndy' };
    } catch (e: any) {
      this.logger.error('getCategoryRating error:', e);
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Kategoriýa statistikasyny alyp bolmady', e);
    }
  }

  async getOfficesRating(filters: GetSummaryFilterDto, userPayload: any, lang = 'tk') {
    try {
      const range = resolveRange(filters);
      if (!range) return invalidRange();
      const rp: Record<string, any> = {};
      // Currency is not filtered here: every office row carries both USD and TMT.
      const officeGuid = await this.resolveOfficeGuid(filters, userPayload);
      if (officeGuid === undefined) return noOffice();
      const conds = baseConds(officeGuid, undefined, rp);
      conds.push(rangeCond(range, 'cur', rp), NOT_REFUND, 'tc.office_guid IS NOT NULL');
      const sumIf = (cur: string, col: string) => `SUM(CASE WHEN ${CURRENCY} = '${cur}' THEN tc.${col} ELSE 0 END)`;
      // sale_price_usd / credit_usd are always USD, so add them directly to the USD bucket.
      const rows = await this.select(`
        WITH agg AS (
          SELECT
            o.guid AS office_guid,
            o."fullName" AS office_name,
            o."shortName" AS office_short_name,
            COUNT(*)::int AS count,
            (${sumIf('USD', 'sale_price')} + COALESCE(SUM(${USD_SALE}), 0))::numeric(14,2) AS income_usd,
            ${sumIf('TMT', 'sale_price')}::numeric(14,2) AS income_tmt,
            ${sumIf('USD', 'net_price')}::numeric(14,2)  AS expense_usd,
            ${sumIf('TMT', 'net_price')}::numeric(14,2)  AS expense_tmt,
            ${sumIf('USD', 'profit')}::numeric(14,2)     AS profit_usd,
            ${sumIf('TMT', 'profit')}::numeric(14,2)     AS profit_tmt
          FROM tbl_total_calculations tc
          JOIN tbl_offices o ON o.guid = tc.office_guid
          WHERE ${conds.join(' AND ')}
          GROUP BY o.guid, o."fullName", o."shortName"
        )
        SELECT *,
          ROUND(income_usd * 100.0 / NULLIF(SUM(income_usd) OVER (), 0), 2) AS percent_usd,
          ROUND(income_tmt * 100.0 / NULLIF(SUM(income_tmt) OVER (), 0), 2) AS percent_tmt
        FROM agg
        ORDER BY income_usd DESC`, rp);

      const data = rows.map((r) => ({
        office_guid: r.office_guid,
        office_name: localized(r.office_name, lang),
        office_short_name: localized(r.office_short_name, lang),
        count: Number(r.count),
        // `percent` (USD share) is kept for existing clients.
        percent: r2(r.percent_usd),
        share: { USD: r2(r.percent_usd), TMT: r2(r.percent_tmt) },
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

  async getOneOffices(
    filters: { start_date?: string; end_date?: string; currency?: string },
    lang: string = 'tk',
  ) {
    try {
      let whereClauses: string[] = [];
      let replacements: any = { lang };
      if (filters.start_date && filters.end_date) {
        whereClauses.push(`tc.datetime BETWEEN :start_date AND :end_date`);
        replacements.start_date = filters.start_date;
        replacements.end_date = filters.end_date;
      } else if (filters.start_date) {
        whereClauses.push(`tc.datetime >= :start_date`);
        replacements.start_date = filters.start_date;
      } else if (filters.end_date) {
        whereClauses.push(`tc.datetime <= :end_date`);
        replacements.end_date = filters.end_date;
      }
      if (filters.currency) {
        whereClauses.push(`tc.currency = :currency`);
        replacements.currency = filters.currency;
      }
      const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
      const query = `
        WITH ranked_offices AS (
          SELECT 
            tc.currency,
            tc.office_guid, 
            SUM(tc.profit) AS total_profit,
            o."fullName"->>:lang AS office_name,
            o."shortName"->>:lang AS office_short_name,
            ROW_NUMBER() OVER (PARTITION BY tc.currency ORDER BY SUM(tc.profit) DESC) as rn
          FROM tbl_total_calculations tc
          LEFT JOIN tbl_offices o ON tc.office_guid = o.guid
          ${whereSql}
          GROUP BY tc.currency, tc.office_guid, o."fullName", o."shortName"
        )
        SELECT currency, office_guid, total_profit, office_name, office_short_name
        FROM ranked_offices
        WHERE rn = 1;
      `;
      const [results] = await this.sequelize.query(query, {
        replacements,
      });
      return successResponse(HttpStatuses.OK, results, 'successfully');
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'error', error,
      );
    }
  }



  async getStatusAnalytics(
    filters: DashboardFilterDto,
  ) {
    try {
      let whereClauses: string[] = [];
      let replacements: any = {};
      if (filters.start_date && filters.end_date) {
        whereClauses.push(`datetime BETWEEN :start_date AND :end_date`);
        replacements.start_date = `${filters.start_date} 00:00:00`;
        replacements.end_date = `${filters.end_date} 23:59:59`;
      } else if (filters.start_date) {
        whereClauses.push(`datetime >= :start_date`);
        replacements.start_date = `${filters.start_date} 00:00:00`;
      } else if (filters.end_date) {
        whereClauses.push(`datetime <= :end_date`);
        replacements.end_date = `${filters.end_date} 23:59:59`;
      }
      if (filters.office_guid) {
        whereClauses.push(`office_guid = :office_guid`);
        replacements.office_guid = filters.office_guid;
      }
      // whereSqlNC: all filters except currency (used for USD dual-currency rows)
      const whereSqlNC = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
      if (filters.currency) {
        whereClauses.push(`UPPER(TRIM(currency)) = :currency`);
        replacements.currency = filters.currency.trim().toUpperCase();
      }
      const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
      const query = `
        WITH stats_raw AS (
          SELECT 
            UPPER(TRIM(COALESCE(currency, 'OTHER'))) AS currency_key,
            COALESCE(status, 'NULL') AS status_key,
            COUNT(*)::int AS count_sales,
            COALESCE(SUM(sale_price), 0)::numeric(14,2) AS total_sale_price,
            COALESCE(SUM(credit_price), 0)::numeric(14,2) AS total_credit_price
          FROM tbl_total_calculations
          ${whereSql}
          GROUP BY UPPER(TRIM(COALESCE(currency, 'OTHER'))), COALESCE(status, 'NULL')
          UNION ALL
          -- Visa dual-currency USD amounts, bucketed by their status
          SELECT 'USD'::text,
            COALESCE(status, 'NULL'),
            0,
            COALESCE(SUM(COALESCE(sale_price_usd, 0)), 0)::numeric(14,2),
            COALESCE(SUM(COALESCE(credit_usd, 0)), 0)::numeric(14,2)
          FROM tbl_total_calculations
          ${whereSqlNC}
          GROUP BY COALESCE(status, 'NULL')
          HAVING COALESCE(SUM(COALESCE(sale_price_usd, 0)), 0) > 0
              OR COALESCE(SUM(COALESCE(credit_usd, 0)), 0) > 0
        ),
        stats AS (
          SELECT currency_key, status_key,
            SUM(count_sales)::int AS count_sales,
            SUM(total_sale_price)::numeric(14,2) AS total_sale_price,
            SUM(total_credit_price)::numeric(14,2) AS total_credit_price
          FROM stats_raw
          GROUP BY 1, 2
        ),
        currency_aggregates AS (
          SELECT 
            currency_key, 
            SUM(count_sales) AS overall_count,
            SUM(total_credit_price) AS grand_total_credit_price
          FROM stats 
          GROUP BY currency_key
        )
        SELECT 
          s.currency_key,
          s.status_key,
          s.count_sales,
          s.total_sale_price,
          ca.grand_total_credit_price,
          ROUND((s.count_sales * 100.0) / NULLIF(ca.overall_count, 0), 2) AS percentage
        FROM stats s
        JOIN currency_aggregates ca ON s.currency_key = ca.currency_key
        ORDER BY s.currency_key, s.count_sales DESC;
      `;
      const rows: any = await this.sequelize.query(query, {
        replacements,
        type: QueryTypes.SELECT,
      });

      const targetCurrencies = filters.currency
        ? [filters.currency.trim().toUpperCase()]
        : ['USD', 'TMT'];
      const defaultStatuses = ['paid', 'NULL', 'notpaid', 'REFUND'];
      const formattedData: any = {};
      for (const cur of targetCurrencies) {
        formattedData[cur] = {
          total_credit_price: "0.00",
          data: defaultStatuses.map(status => ({
            status_key: status,
            count_sales: 0,
            total_sale_price: "0.00",
            percentage: "0.00"
          }))
        };
      }
      rows.forEach((r: any) => {
        if (!formattedData[r.currency_key]) {
          formattedData[r.currency_key] = {
            total_credit_price: "0.00",
            data: defaultStatuses.map(status => ({
              status_key: status,
              count_sales: 0,
              total_sale_price: "0.00",
              percentage: "0.00"
            }))
          };
        }
        formattedData[r.currency_key].total_credit_price = r.grand_total_credit_price;
        const existingStatus = formattedData[r.currency_key].data.find((item: any) => item.status_key === r.status_key);
        if (existingStatus) {
          existingStatus.count_sales = r.count_sales;
          existingStatus.total_sale_price = r.total_sale_price;
          existingStatus.percentage = r.percentage || "0.00";
        } else {
          formattedData[r.currency_key].data.push({
            status_key: r.status_key,
            count_sales: r.count_sales,
            total_sale_price: r.total_sale_price,
            percentage: r.percentage || "0.00",
          });
        }
      });
      return successResponse(HttpStatuses.OK, formattedData, 'successfully');
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'error', error);
    }
  }

  /**
   * One category in detail: per-currency totals against the previous range,
   * plus chart buckets. Same sale rules as getSummary (refunds left out).
   */
  async getCategoryDetailAnalytics(categoryGuid: string, filters: GetSummaryFilterDto, userPayload: any) {
    try {
      const cur = resolveRange(filters);
      if (!cur) return invalidRange();
      const prev = resolvePrevRange(filters, cur);
      if (!prev) return invalidRange();
      const granularity = resolveGranularity(filters, cur);
      const officeGuid = await this.resolveOfficeGuid(filters, userPayload);
      if (officeGuid === undefined) return noOffice();
      const currencies = filters.currency?.trim() ? [filters.currency.trim().toUpperCase()] : CURRENCIES;

      const rp: Record<string, any> = { granularity, catGuid: categoryGuid };
      const conds = baseConds(officeGuid, filters.currency, rp);
      conds.push('tc.category_guid = :catGuid', NOT_REFUND);
      const curCond = rangeCond(cur, 'cur', rp);
      const prevCond = rangeCond(prev, 'prev', rp);

      const [totalRows, chartRows] = await Promise.all([
        this.select(`
          SELECT CASE WHEN ${curCond} THEN 'cur' ELSE 'prev' END AS period,
            ${CURRENCY} AS currency,
            COUNT(*)::int AS count,
            COALESCE(SUM(tc.sale_price), 0) AS sale,
            COALESCE(SUM(tc.profit), 0) AS profit,
            COALESCE(SUM(tc.credit_price), 0) AS credit
          FROM tbl_total_calculations tc
          WHERE ${conds.join(' AND ')} AND (${curCond} OR ${prevCond})
          GROUP BY 1, 2
          UNION ALL
          SELECT CASE WHEN ${curCond} THEN 'cur' ELSE 'prev' END, 'USD'::text, 0,
            COALESCE(SUM(${USD_SALE}), 0), 0,
            COALESCE(SUM(${USD_CREDIT}), 0)
          FROM tbl_total_calculations tc
          WHERE ${conds.join(' AND ')} AND (${curCond} OR ${prevCond})
          GROUP BY 1
          HAVING COALESCE(SUM(${USD_SALE}), 0) > 0 OR COALESCE(SUM(${USD_CREDIT}), 0) > 0`, rp),
        this.select(`
          SELECT TO_CHAR(DATE_TRUNC(:granularity, tc.datetime AT TIME ZONE :tz), 'YYYY-MM-DD') AS bucket,
            ${CURRENCY} AS currency,
            COALESCE(SUM(tc.sale_price), 0) AS sale,
            COALESCE(SUM(tc.profit), 0) AS profit
          FROM tbl_total_calculations tc
          WHERE ${conds.join(' AND ')} AND ${curCond}
          GROUP BY 1, 2
          UNION ALL
          SELECT TO_CHAR(DATE_TRUNC(:granularity, tc.datetime AT TIME ZONE :tz), 'YYYY-MM-DD'),
            'USD'::text, COALESCE(SUM(${USD_SALE}), 0), 0
          FROM tbl_total_calculations tc
          WHERE ${conds.join(' AND ')} AND ${curCond}
          GROUP BY 1
          HAVING COALESCE(SUM(${USD_SALE}), 0) > 0`, rp),
      ]);

      const buckets = buildBuckets(cur, granularity);

      // Aggregate totalRows and chartRows by (period/bucket + currency) — UNION ALL may produce duplicate keys
      const totalAgg = new Map<string, any>();
      for (const r of totalRows) {
        const key = `${r.period}_${r.currency}`;
        const e = totalAgg.get(key);
        if (e) {
          e.sale = r2(Number(e.sale) + Number(r.sale || 0));
          e.profit = r2(Number(e.profit) + Number(r.profit || 0));
          e.credit = r2(Number(e.credit) + Number(r.credit || 0));
          e.count += Number(r.count || 0);
        } else { totalAgg.set(key, { ...r, sale: Number(r.sale || 0), profit: Number(r.profit || 0), credit: Number(r.credit || 0), count: Number(r.count || 0) }); }
      }
      const chartAgg = new Map<string, any>();
      for (const r of chartRows) {
        const key = `${r.bucket}_${r.currency}`;
        const e = chartAgg.get(key);
        if (e) { e.sale = r2(Number(e.sale) + Number(r.sale || 0)); e.profit = r2(Number(e.profit) + Number(r.profit || 0)); }
        else { chartAgg.set(key, { ...r, sale: Number(r.sale || 0), profit: Number(r.profit || 0) }); }
      }

      const currenciesData = Object.fromEntries(currencies.map((c) => {
        const now = totalAgg.get(`cur_${c}`);
        const before = totalAgg.get(`prev_${c}`);
        const count = now?.count || 0;
        const total = Number(now?.sale) || 0;
        const profit = Number(now?.profit) || 0;
        const credit = Number(now?.credit) || 0;
        const previous = Number(before?.sale) || 0;
        return [c, {
          summary: {
            total_count_sales: count,
            total_sale_price: r2(total),
            previous_sale_price: r2(previous),
            change_percent: pct(total, previous),
            profit: r2(profit),
            profit_percent: total === 0 ? 0 : r2((profit * 100) / total),
            avg_sale_price: count === 0 ? 0 : r2(total / count),
            credit_price: r2(credit),
          },
          chart: buckets.map((b) => {
            const v = chartAgg.get(`${b.key}_${c}`);
            return { label: b.label, date: b.key, sale: r2(v?.sale), profit: r2(v?.profit) };
          }),
        }];
      }));

      return {
        status: 200,
        data: {
          category_guid: categoryGuid,
          granularity,
          range: { start: cur.start, end: cur.end, prev_start: prev.start, prev_end: prev.end },
          currencies: currenciesData,
        },
        message: 'Kategori detallary üstünlikli alyndy',
      };
    } catch (e: any) {
      this.logger.error('getCategoryDetailAnalytics error:', e);
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Kategoriýa detallaryny alyp bolmady', e);
    }
  }

  /** Top 10 operators of one category, per currency, in the current range. */
  async getTopOperators(categoryGuid: string, filters: DashboardFilterDto, userPayload: any) {
    try {
      const range = resolveRange(filters);
      if (!range) return invalidRange();
      const officeGuid = await this.resolveOfficeGuid(filters, userPayload);
      if (officeGuid === undefined) return noOffice();
      const currencies = filters.currency?.trim() ? [filters.currency.trim().toUpperCase()] : CURRENCIES;

      const rp: Record<string, any> = { catGuid: categoryGuid };
      const conds = baseConds(officeGuid, filters.currency, rp);
      conds.push('tc.category_guid = :catGuid', rangeCond(range, 'cur', rp), NOT_REFUND);

      const rows = await this.select(`
        WITH raw AS (
          SELECT ${CURRENCY} AS currency,
            COALESCE(e."fullName", 'Näbelli') AS operator_name,
            COUNT(*)::int AS cnt,
            COALESCE(SUM(tc.sale_price), 0) AS sale_sum,
            COALESCE(SUM(tc.profit), 0) AS profit_sum
          FROM tbl_total_calculations tc
          LEFT JOIN tbl_employees e ON e.guid = tc.receiver_opr_guid
          WHERE ${conds.join(' AND ')}
          GROUP BY ${CURRENCY}, tc.receiver_opr_guid, e."fullName"
          UNION ALL
          SELECT 'USD'::text,
            COALESCE(e."fullName", 'Näbelli'), 0,
            COALESCE(SUM(${USD_SALE}), 0), 0
          FROM tbl_total_calculations tc
          LEFT JOIN tbl_employees e ON e.guid = tc.receiver_opr_guid
          WHERE ${conds.join(' AND ')}
          GROUP BY tc.receiver_opr_guid, e."fullName"
          HAVING COALESCE(SUM(${USD_SALE}), 0) > 0
        ),
        agg AS (
          SELECT currency, operator_name,
            SUM(cnt)::int AS count_sales,
            SUM(sale_sum) AS total_sale_price,
            SUM(profit_sum) AS total_profit,
            ROW_NUMBER() OVER (PARTITION BY currency ORDER BY SUM(sale_sum) DESC NULLS LAST)::int AS rank
          FROM raw
          GROUP BY currency, operator_name
        )
        SELECT * FROM agg WHERE rank <= 10 ORDER BY rank`, rp);

      const data = Object.fromEntries(currencies.map((c) => [c, rows
        .filter((r) => r.currency === c)
        .map((r) => ({
          rank: r.rank,
          operator_name: r.operator_name,
          count_sales: r.count_sales,
          total_sale_price: r2(r.total_sale_price),
          total_profit: r2(r.total_profit),
        }))]));

      return { status: 200, data, message: 'Iň köp satany operatorlar üstünlikli alyndy' };
    } catch (e: any) {
      this.logger.error('getTopOperators error:', e);
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Operatorlary alyp bolmady', e);
    }
  }
}
