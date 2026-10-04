import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op, fn, col, literal } from 'sequelize';
import { TotalCalculation } from '../total_calculations/entities/total_calculation.entity';
import { GetSummaryFilterDto } from './dto/dashboard-filter.dto';
import { Sequelize } from 'sequelize-typescript';
import { Employee } from '../employee/entities/employee.entity';
import { Category } from '../category/entities/category.entity';
import { Office } from '../office/entities/office.entity';
import { GetCategoryAnalyticsFilterDto } from './dto/GetCategoryAnalyticsFilterDto-filter.dto';
import { SYSTEM_CATEGORIES } from '../total_calculations/total_calculations.service';

type Currency = 'USD' | 'TMT';

const T = '"TotalCalculation"';

// The query's `currency` is not validated; anything but USD reads as TMT, and
// only these two literals ever reach the SQL below.
const toCurrency = (value: any): Currency => (value === 'USD' ? 'USD' : 'TMT');

// Dashboards report sales: the rows the project triggers write for a sold
// service (B2B, tickets, visa…). Kassa rows (MANUAL / EXCEL) are cash moves,
// not sales, and the month's salary is a cost of the office — both stay out.
const SALES_ONLY_SQL =
  `COALESCE(${T}.source, 'PROJECT') = 'PROJECT' ` +
  `AND ${T}.category_guid IS DISTINCT FROM '${SYSTEM_CATEGORIES.SALARY}'`;

// USD and TMT are reported separately and never converted. A visa row is
// booked as TMT with its USD price in sale_price_usd / credit_usd, so it
// counts in USD when it has a USD price and in TMT unless it is USD-only.
const inCurrencySql = (c: Currency) =>
  c === 'USD'
    ? `(${T}.currency = 'USD' OR COALESCE(${T}.sale_price_usd, 0) > 0 OR COALESCE(${T}.credit_usd, 0) > 0)`
    : `(${T}.currency = 'TMT' AND NOT (COALESCE(${T}.sale_price_usd, 0) > 0 AND COALESCE(${T}.sale_price, 0) = 0))`;

// Per-row amounts in one currency; every endpoint sums these, so a figure means
// the same on every card. A visa row is booked as TMT and keeps its USD side
// in the *_usd columns, so each USD amount takes those from a non-USD row.
const AMOUNT_SQL = {
  sale: (c: Currency) =>
    c === 'USD'
      ? `CASE WHEN ${T}.currency = 'USD' THEN COALESCE(${T}.sale_price, 0) ELSE COALESCE(${T}.sale_price_usd, 0) END`
      : `CASE WHEN ${T}.currency = 'TMT' THEN COALESCE(${T}.sale_price, 0) ELSE 0 END`,
  credit: (c: Currency) =>
    c === 'USD'
      ? `CASE WHEN ${T}.currency = 'USD' THEN COALESCE(${T}.credit_price, 0) ELSE COALESCE(${T}.credit_usd, 0) END`
      : `CASE WHEN ${T}.currency = 'TMT' THEN COALESCE(${T}.credit_price, 0) ELSE 0 END`,
  net: (c: Currency) =>
    c === 'USD'
      ? `CASE WHEN ${T}.currency = 'USD' THEN COALESCE(${T}.net_price, 0) ELSE COALESCE(${T}.net_price_usd, 0) END`
      : `CASE WHEN ${T}.currency = 'TMT' THEN COALESCE(${T}.net_price, 0) ELSE 0 END`,
  profit: (c: Currency) =>
    c === 'USD'
      ? `CASE WHEN ${T}.currency = 'USD' THEN COALESCE(${T}.profit, 0) ELSE COALESCE(${T}.profit_usd, 0) END`
      : `CASE WHEN ${T}.currency = 'TMT' THEN COALESCE(${T}.profit, 0) ELSE 0 END`,
};

const sumOf = (sql: string) => literal(`COALESCE(SUM(${sql}), 0)`);

const round2 = (value: number) => Math.round(value * 100) / 100;

type Interval = 'day' | 'week' | 'month';

// A picked range is bucketed by its length, so a chart never draws hundreds of
// daily spikes: about a month by day, about half a year by week, longer by month.
const intervalFor = (start: Date, end: Date): Interval => {
  const days = (end.getTime() - start.getTime()) / 86400000;
  return days <= 45 ? 'day' : days <= 190 ? 'week' : 'month';
};

// Sortable bucket key that carries the year: a date for days and for weeks (a
// week is keyed by its Monday), "YYYY-MM" for months.
const bucketKeySql = (interval: Interval) =>
  interval === 'month'
    ? `TO_CHAR(${T}.datetime, 'YYYY-MM')`
    : interval === 'week'
      ? `TO_CHAR(DATE_TRUNC('week', ${T}.datetime), 'YYYY-MM-DD')`
      : `TO_CHAR(${T}.datetime, 'YYYY-MM-DD')`;

// `base` narrowed to sales rows, and to one currency when given.
const salesWhere = (base: any, currency?: Currency) => ({
  ...base,
  [Op.and]: [literal(SALES_ONLY_SQL), ...(currency ? [literal(inCurrencySql(currency))] : [])],
});

// Sales in either currency. Counted over this, a visa priced in both TMT and
// USD is one sale, while the per-currency counts above take it in each.
const anyCurrencySalesWhere = (base: any) => ({
  ...base,
  [Op.and]: [literal(SALES_ONLY_SQL), literal(`(${inCurrencySql('TMT')} OR ${inCurrencySql('USD')})`)],
});

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(TotalCalculation)
    private readonly totalCalculationModel: typeof TotalCalculation,
    private readonly sequelize: Sequelize,
  ) { }



  async getDashboardSummary(filters: GetSummaryFilterDto) {
    let { start_date, end_date, period_preset, office_guid, currency = 'TMT' } = filters;
    let currentStart: Date = new Date();
    let currentEnd: Date = new Date();
    if (period_preset) {
      const now = new Date();
      if (period_preset === 'this_month') {
        currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
        currentEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      } else if (period_preset === 'last_month') {
        currentStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        currentEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      } else if (period_preset === 'last_3_months') {
        currentStart = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        currentEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      } else if (period_preset === 'this_year') {
        currentStart = new Date(now.getFullYear(), 0, 1);
        currentEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
      }
    } else if (start_date && end_date) {
      currentStart = new Date(start_date);
      currentEnd = new Date(end_date);
      currentEnd.setHours(23, 59, 59);
    } else {
      const now = new Date();
      currentStart = new Date(now.getFullYear(), 0, 1);
      currentEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
    }

    const durationMs = currentEnd.getTime() - currentStart.getTime();
    const prevStart = new Date(currentStart.getTime() - durationMs - 1);
    const prevEnd = new Date(currentStart.getTime() - 1);

    const baseWhere: any = {
      datetime: { [Op.between]: [currentStart, currentEnd] },
    };
    const prevWhere: any = {
      datetime: { [Op.between]: [prevStart, prevEnd] },
    };

    if (office_guid) {
      baseWhere.office_guid = office_guid;
      prevWhere.office_guid = office_guid;
    }

    const [currentUsdData, prevUsdData, currentTmtData, prevTmtData, currentSalary, prevSalary, currentAll, prevAll] =
      await Promise.all([
        this.calculateMetrics(baseWhere, 'USD'),
        this.calculateMetrics(prevWhere, 'USD'),
        this.calculateMetrics(baseWhere, 'TMT'),
        this.calculateMetrics(prevWhere, 'TMT'),
        this.salaryExpense(baseWhere),
        this.salaryExpense(prevWhere),
        this.countAllSales(baseWhere),
        this.countAllSales(prevWhere),
      ]);
    const currentAllCount = currentAll.get('') || 0;
    const prevAllCount = prevAll.get('') || 0;
    const activeCurrentCount = currency === 'USD' ? currentUsdData.count : currentTmtData.count;
    const activePrevCount = currency === 'USD' ? prevUsdData.count : prevTmtData.count;
    const salesCountStats = this.calcPercentage(activeCurrentCount, activePrevCount);

    const salePriceUsdStats = this.calcPercentage(currentUsdData.totalSale, prevUsdData.totalSale);
    const salePriceTmtStats = this.calcPercentage(currentTmtData.totalSale, prevTmtData.totalSale);

    const netPriceUsdStats = this.calcPercentage(currentUsdData.totalNetPrice, prevUsdData.totalNetPrice);
    const netPriceTmtStats = this.calcPercentage(currentTmtData.totalNetPrice, prevTmtData.totalNetPrice);

    const creditUsdStats = this.calcPercentage(currentUsdData.totalCredit, prevUsdData.totalCredit);
    const creditTmtStats = this.calcPercentage(currentTmtData.totalCredit, prevTmtData.totalCredit);

    const profitUsdStats = this.calcPercentage(currentUsdData.totalProfit, prevUsdData.totalProfit);
    const profitTmtStats = this.calcPercentage(currentTmtData.totalProfit, prevTmtData.totalProfit);

    return {
      sales_count: {
        value: activeCurrentCount,
        ...salesCountStats,
      },
      sales_count_all: {
        value: currentAllCount,
        ...this.calcPercentage(currentAllCount, prevAllCount),
      },
      sale_price: {
        usd: { value: currentUsdData.totalSale, ...salePriceUsdStats },
        tmt: { value: currentTmtData.totalSale, ...salePriceTmtStats },
      },
      net_price: {
        usd: { value: currentUsdData.totalNetPrice, ...netPriceUsdStats },
        tmt: { value: currentTmtData.totalNetPrice, ...netPriceTmtStats },
      },
      credit_price: {
        usd: { value: currentUsdData.totalCredit, ...creditUsdStats },
        tmt: { value: currentTmtData.totalCredit, ...creditTmtStats },
      },
      profit: {
        usd: { value: currentUsdData.totalProfit, ...profitUsdStats },
        tmt: { value: currentTmtData.totalProfit, ...profitTmtStats },
      },
      // Not a sale: the locked months' salaries (TMT) and USD bonuses.
      salary: {
        usd: { value: currentSalary.USD, ...this.calcPercentage(currentSalary.USD, prevSalary.USD) },
        tmt: { value: currentSalary.TMT, ...this.calcPercentage(currentSalary.TMT, prevSalary.TMT) },
      },
    };
  }


  private async salaryExpense(whereCondition: any): Promise<Record<Currency, number>> {
    const result: any = await this.totalCalculationModel.findOne({
      where: { ...whereCondition, category_guid: SYSTEM_CATEGORIES.SALARY },
      attributes: [
        [sumOf(AMOUNT_SQL.net('USD')), 'usd'],
        [sumOf(AMOUNT_SQL.net('TMT')), 'tmt'],
      ],
      raw: true,
    });
    return { USD: Number(result?.usd || 0), TMT: Number(result?.tmt || 0) };
  }





  // Every sale once, whatever its currency: the `count_all` the endpoints send
  // beside their per-currency figures, so a page showing TMT and USD together
  // has one sales count. Keyed by `groupSql`'s value, or '' when not grouped.
  private async countAllSales(whereCondition: any, groupSql?: string): Promise<Map<string, number>> {
    const group = groupSql ? literal(groupSql) : null;
    const rows: any[] = await this.totalCalculationModel.findAll({
      where: anyCurrencySalesWhere(whereCondition),
      attributes: [...(group ? [[group, 'group_key'] as any] : []), [literal('COUNT(*)'), 'count']],
      ...(group ? { group: [group as any] } : {}),
      raw: true,
    });
    return new Map(rows.map((row) => [group ? String(row.group_key ?? '') : '', Number(row.count || 0)]));
  }

  private async calculateMetrics(whereCondition: any, currency: Currency) {
    const result = await this.totalCalculationModel.findOne({
      where: salesWhere(whereCondition, currency),
      attributes: [
        [literal('COUNT(*)'), 'count'],
        [sumOf(AMOUNT_SQL.sale(currency)), 'totalSale'],
        [sumOf(AMOUNT_SQL.credit(currency)), 'totalCredit'],
        [sumOf(AMOUNT_SQL.net(currency)), 'totalNetPrice'],
        [sumOf(AMOUNT_SQL.profit(currency)), 'totalProfit'],
      ],
      raw: true,
    });

    return {
      count: Number(result?.['count'] || 0),
      totalSale: Number(result?.['totalSale'] || 0),
      totalCredit: Number(result?.['totalCredit'] || 0),
      totalNetPrice: Number(result?.['totalNetPrice'] || 0),
      totalProfit: Number(result?.['totalProfit'] || 0),
    };
  }


  // Money going out in one currency, per day / week / month, split by where it
  // goes: the cost of the period's sales, salaries (locked months and USD
  // bonuses) and kassa expenses entered by hand or imported from Excel. Kassa
  // expenses are kept as their own group, so a supplier payment or salary also
  // booked in the kassa shows up next to its twin instead of hiding in a sum.
  async getMoneyOut(filters: GetSummaryFilterDto) {
    const { start_date, end_date, period_preset, office_guid } = filters;
    const currencyParam = toCurrency(filters.currency);
    const now = new Date();

    let currentStart: Date;
    let currentEnd: Date;
    let interval: Interval = 'day';
    if (period_preset === 'last_month') {
      currentStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      currentEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    } else if (period_preset === 'last_3_months') {
      currentStart = new Date(now.getFullYear(), now.getMonth() - 3, 1, 0, 0, 0, 0);
      currentEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      interval = 'week';
    } else if (period_preset === 'this_year' || (!period_preset && !(start_date && end_date))) {
      currentStart = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      currentEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      interval = 'month';
    } else if (period_preset === 'this_month') {
      currentStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      currentEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else {
      currentStart = new Date(start_date as string);
      currentStart.setHours(0, 0, 0, 0);
      currentEnd = new Date(end_date as string);
      currentEnd.setHours(23, 59, 59, 999);
      interval = intervalFor(currentStart, currentEnd);
    }
    // The previous period is the same length right before, as on the cards.
    const prevEnd = new Date(currentStart.getTime() - 1);
    const prevStart = new Date(prevEnd.getTime() - (currentEnd.getTime() - currentStart.getTime()));

    const net = `COALESCE(${T}.net_price, 0)`;
    const own = `${T}.currency = '${currencyParam}'`;
    // The cost of sales is summed like on every other card (a visa's USD cost
    // sits on a TMT row), so the rows are not narrowed to one currency here;
    // salaries and kassa expenses are rows of the asked currency.
    const groupSums: [any, string][] = [
      [sumOf(`CASE WHEN ${SALES_ONLY_SQL} THEN ${AMOUNT_SQL.net(currencyParam)} ELSE 0 END`), 'cost'],
      [sumOf(`CASE WHEN ${own} AND ${T}.category_guid = '${SYSTEM_CATEGORIES.SALARY}' THEN ${net} ELSE 0 END`), 'salary'],
      [sumOf(`CASE WHEN ${own} AND ${T}.source IN ('MANUAL', 'EXCEL') AND ${T}.type = 'EXPENSE' THEN ${net} ELSE 0 END`), 'expense'],
    ];
    const whereFor = (start: Date, end: Date) => ({
      datetime: { [Op.between]: [start, end] },
      ...(office_guid ? { office_guid } : {}),
    });
    const toGroups = (row: any) => ({
      cost: round2(Number(row?.cost || 0)),
      salary: round2(Number(row?.salary || 0)),
      expense: round2(Number(row?.expense || 0)),
    });

    const periodLiteral = literal(bucketKeySql(interval));
    const [rows, current, previous] = await Promise.all([
      this.totalCalculationModel.findAll({
        where: whereFor(currentStart, currentEnd),
        attributes: [[periodLiteral, 'period'], ...groupSums],
        group: [periodLiteral as any],
        order: [[periodLiteral as any, 'ASC']],
        raw: true,
      }),
      this.totalCalculationModel.findOne({ where: whereFor(currentStart, currentEnd), attributes: groupSums, raw: true }),
      this.totalCalculationModel.findOne({ where: whereFor(prevStart, prevEnd), attributes: groupSums, raw: true }),
    ]);

    return {
      currency: currencyParam,
      totals: toGroups(current),
      previous: toGroups(previous),
      series: rows.map((row: any) => ({ period: row.period, ...toGroups(row) })),
    };
  }




  async getDashboardChartData(filters: GetSummaryFilterDto) {
    const { start_date, end_date, period_preset, office_guid, currency = 'TMT' } = filters;
    const currencyParam = toCurrency(currency);

    let currentStart: Date = new Date();
    let currentEnd: Date = new Date();
    let groupType: 'day' | 'week' | 'month' = 'day';
    if (period_preset) {
      const now = new Date();
      if (period_preset === 'this_month') {
        currentStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        currentEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        groupType = 'day';
      } else if (period_preset === 'last_month') {
        currentStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
        currentEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        groupType = 'day';
      } else if (period_preset === 'last_3_months') {
        currentStart = new Date(now.getFullYear(), now.getMonth() - 3, 1, 0, 0, 0, 0);
        currentEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        groupType = 'week';
      } else if (period_preset === 'this_year') {
        currentStart = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
        currentEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        groupType = 'month';
      }
    } else if (start_date && end_date) {
      currentStart = new Date(start_date);
      currentStart.setHours(0, 0, 0, 0);
      currentEnd = new Date(end_date);
      currentEnd.setHours(23, 59, 59, 999);
      groupType = intervalFor(currentStart, currentEnd);
    } else {
      const now = new Date();
      currentStart = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      currentEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      groupType = 'month';
    }
    const priorWhere: any = { datetime: { [Op.lt]: currentStart } };
    if (office_guid) priorWhere.office_guid = office_guid;
    const baseWhere: any = { datetime: { [Op.between]: [currentStart, currentEnd] } };
    if (office_guid) baseWhere.office_guid = office_guid;
    const priorSumResult = await this.totalCalculationModel.findOne({
      where: salesWhere(priorWhere, currencyParam),
      attributes: [[sumOf(AMOUNT_SQL.profit(currencyParam)), 'total_prior_profit']],
      raw: true,
    });

    let runningAccumulatedProfit = Number((priorSumResult as any)?.total_prior_profit || 0);
    const formattedDateLiteral = literal(bucketKeySql(groupType));
    const countAllByPeriod = await this.countAllSales(baseWhere, bucketKeySql(groupType));
    const results = await this.totalCalculationModel.findAll({
      where: salesWhere(baseWhere, currencyParam),
      attributes: [
        [formattedDateLiteral, 'period'],
        [fn('COUNT', col('guid')), 'sales_count'],
        [sumOf(AMOUNT_SQL.sale(currencyParam)), 'sale_price'],
        [sumOf(AMOUNT_SQL.net(currencyParam)), 'net_price'],
        [sumOf(AMOUNT_SQL.profit(currencyParam)), 'profit'],
      ],
      group: [formattedDateLiteral as any],
      order: [[formattedDateLiteral as any, 'ASC']],
      raw: true,
    });
    const dataMap = new Map<string, any>();
    results.forEach((row: any) => {
      dataMap.set(row.period, {
        sales_count: Number(row.sales_count || 0),
        count_all: countAllByPeriod.get(row.period) || 0,
        sale_price: Number(row.sale_price || 0),
        net_price: Number(row.net_price || 0),
        profit: Number(row.profit || 0),
      });
    });
    const filledResults: any[] = [];
    let iterDate = new Date(currentStart);

    if (groupType === 'day') {
      while (iterDate <= currentEnd) {
        const year = iterDate.getFullYear();
        const month = String(iterDate.getMonth() + 1).padStart(2, '0');
        const day = String(iterDate.getDate()).padStart(2, '0');
        const periodStr = `${year}-${month}-${day}`;

        const currentDayData = dataMap.get(periodStr) || {
          sales_count: 0,
          count_all: countAllByPeriod.get(periodStr) || 0,
          sale_price: 0,
          net_price: 0,
          profit: 0,
        };
        runningAccumulatedProfit += currentDayData.profit;

        filledResults.push({
          period: periodStr,
          ...currentDayData,
          last_profit: runningAccumulatedProfit,
        });

        iterDate.setDate(iterDate.getDate() + 1);
      }
    } else if (groupType === 'month') {
      iterDate = new Date(currentStart.getFullYear(), currentStart.getMonth(), 1);
      const endYear = currentEnd.getFullYear();
      while (iterDate.getFullYear() <= endYear && iterDate <= currentEnd) {
        const year = iterDate.getFullYear();
        const month = String(iterDate.getMonth() + 1).padStart(2, '0');
        const periodStr = `${year}-${month}`;

        const currentMonthData = dataMap.get(periodStr) || {
          sales_count: 0,
          count_all: countAllByPeriod.get(periodStr) || 0,
          sale_price: 0,
          net_price: 0,
          profit: 0,
        };
        runningAccumulatedProfit += currentMonthData.profit;

        filledResults.push({
          period: periodStr,
          ...currentMonthData,
          last_profit: runningAccumulatedProfit,
        });

        iterDate.setMonth(iterDate.getMonth() + 1);
      }
    } else {
      results.forEach((row: any) => {
        const rowProfit = Number(row.profit || 0);
        runningAccumulatedProfit += rowProfit;

        filledResults.push({
          period: row.period,
          sales_count: Number(row.sales_count || 0),
          count_all: countAllByPeriod.get(row.period) || 0,
          sale_price: Number(row.sale_price || 0),
          net_price: Number(row.net_price || 0),
          profit: rowProfit,
          last_profit: runningAccumulatedProfit,
        });
      });
    }

    return filledResults;
  }





  async getDashboardStatusSummary(filters: GetSummaryFilterDto & { currency?: 'USD' | 'TMT' }) {
    let { start_date, end_date, period_preset, office_guid, currency = 'TMT' } = filters;
    const currencyParam = toCurrency(currency);

    let currentStart: Date = new Date();
    let currentEnd: Date = new Date();

    if (period_preset) {
      const now = new Date();
      if (period_preset === 'this_month') {
        currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
        currentEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      } else if (period_preset === 'last_month') {
        currentStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        currentEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      } else if (period_preset === 'last_3_months') {
        currentStart = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        currentEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      } else if (period_preset === 'this_year') {
        currentStart = new Date(now.getFullYear(), 0, 1);
        currentEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
      }
    } else if (start_date && end_date) {
      currentStart = new Date(start_date);
      currentEnd = new Date(end_date);
      currentEnd.setHours(23, 59, 59);
    } else {
      const now = new Date();
      currentStart = new Date(now.getFullYear(), 0, 1);
      currentEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
    }

    const baseWhere: any = {
      datetime: { [Op.between]: [currentStart, currentEnd] },
    };

    if (office_guid) {
      baseWhere.office_guid = office_guid;
    }

    const countAllByStatus = await this.countAllSales(baseWhere, `${T}.status`);
    const results = await this.totalCalculationModel.findAll({
      where: salesWhere(baseWhere, currencyParam),
      attributes: [
        'status',
        [fn('COUNT', col('guid')), 'count'],
        [sumOf(AMOUNT_SQL.sale(currencyParam)), 'total_sale'],
      ],
      group: ['status'],
      raw: true,
    });

    const statusMap = {
      paid: { count: 0, total_sale: 0 },
      notpaid: { count: 0, total_sale: 0 },
      REFUND: { count: 0, total_sale: 0 },
      null: { count: 0, total_sale: 0 },
    };

    let overallTotalCount = 0;

    results.forEach((row: any) => {
      const rawStatus = row.status;
      const key = rawStatus === null || rawStatus === undefined || rawStatus === '' ? 'null' : rawStatus;

      const count = Number(row.count || 0);
      const totalSale = Number(row.total_sale || 0);

      if (statusMap[key]) {
        statusMap[key].count = count;
        statusMap[key].total_sale = totalSale;
      } else {
        statusMap['null'].count += count;
        statusMap['null'].total_sale += totalSale;
      }

      overallTotalCount += count;
    });

    // The currency-free count per status; an unknown status folds into "no status", as above.
    const countAll = { paid: 0, notpaid: 0, REFUND: 0, null: 0 };
    countAllByStatus.forEach((count, status) => {
      countAll[status in countAll && status !== '' ? status : 'null'] += count;
    });

    const formatStatusItem = (item: { count: number; total_sale: number }, countAllOf: number) => {
      const percentage = overallTotalCount > 0 ? Math.round((item.count / overallTotalCount) * 100) : 0;
      return {
        count: item.count,
        count_all: countAllOf,
        total_sale: item.total_sale,
        percentage: percentage,
      };
    };

    return {
      currency: currencyParam,
      statuses: {
        paid: formatStatusItem(statusMap['paid'], countAll.paid),
        notpaid: formatStatusItem(statusMap['notpaid'], countAll.notpaid),
        refund: formatStatusItem(statusMap['REFUND'], countAll.REFUND),
        no_status: formatStatusItem(statusMap['null'], countAll.null),
      },
    };
  }




  async getOperatorsRanking(filters: GetCategoryAnalyticsFilterDto) {
    const { start_date, end_date, period_preset, office_guid, category_guid, currency = 'TMT' } = filters;
    const currencyParam = toCurrency(currency);

    let currentStart: Date = new Date();
    let currentEnd: Date = new Date();
    if (period_preset) {
      const now = new Date();
      if (period_preset === 'this_month') {
        currentStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        currentEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      } else if (period_preset === 'last_month') {
        currentStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
        currentEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      } else if (period_preset === 'last_3_months') {
        currentStart = new Date(now.getFullYear(), now.getMonth() - 3, 1, 0, 0, 0, 0);
        currentEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      } else if (period_preset === 'this_year') {
        currentStart = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
        currentEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      }
    } else if (start_date && end_date) {
      currentStart = new Date(start_date);
      currentEnd = new Date(end_date);
      currentEnd.setHours(23, 59, 59, 999);
    } else {
      const now = new Date();
      currentStart = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      currentEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    }
    const baseWhere: any = {
      datetime: { [Op.between]: [currentStart, currentEnd] },
      receiver_opr_guid: { [Op.not]: null },
    };

    if (office_guid) {
      baseWhere.office_guid = office_guid;
    }

    if (category_guid) {
      baseWhere.category_guid = category_guid;
    }

    const countAllByOperator = await this.countAllSales(baseWhere, `${T}.receiver_opr_guid`);
    const results = await this.totalCalculationModel.findAll({
      where: salesWhere(baseWhere, currencyParam),
      attributes: [
        'receiver_opr_guid',
        [fn('COUNT', col('TotalCalculation.guid')), 'sales_count'],
        [sumOf(AMOUNT_SQL.sale(currencyParam)), 'total_sale'],
        [sumOf(AMOUNT_SQL.profit(currencyParam)), 'total_profit'],
      ],
      include: [
        {
          model: Employee,
          as: 'receiver_operator',
          attributes: ['fullName'],
          required: false,
        },
      ],
      group: [
        'TotalCalculation.receiver_opr_guid',
        'receiver_operator.guid',
        'receiver_operator.fullName',
      ],
      raw: true,
    });
    let overallTotalSalesCount = 0;
    results.forEach((row: any) => {
      overallTotalSalesCount += Number(row.sales_count || 0);
    });
    const mappedResults = results.map((row: any) => {
      const salesCount = Number(row.sales_count || 0);
      const profit = Number(row.total_profit || 0);
      const salePrice = Number(row.total_sale || 0);

      let percentage = 0;
      if (overallTotalSalesCount > 0) {
        percentage = Number(((salesCount / overallTotalSalesCount) * 100).toFixed(1));
      }

      return {
        operator_guid: row.receiver_opr_guid,
        operator_name: row['receiver_operator.fullName'] || 'Bilinmeyen Operatör',
        sales_count: salesCount,
        count_all: countAllByOperator.get(String(row.receiver_opr_guid)) || 0,
        percentage: percentage,
        sale_price: salePrice,
        profit: profit,
      };
    });
    return mappedResults.sort((a, b) => b.sales_count - a.sales_count);
  }





  async getCategoriesRanking(filters: GetSummaryFilterDto & { currency?: 'USD' | 'TMT' }) {
    let { start_date, end_date, period_preset, office_guid, currency = 'TMT' } = filters;

    let currentStart: Date = new Date();
    let currentEnd: Date = new Date();

    if (period_preset) {
      const now = new Date();
      if (period_preset === 'this_month') {
        currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
        currentEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      } else if (period_preset === 'last_month') {
        currentStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        currentEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      } else if (period_preset === 'last_3_months') {
        currentStart = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        currentEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      } else if (period_preset === 'this_year') {
        currentStart = new Date(now.getFullYear(), 0, 1);
        currentEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      }
    } else if (start_date && end_date) {
      currentStart = new Date(start_date);
      currentEnd = new Date(end_date);
      currentEnd.setHours(23, 59, 59, 999);
    } else {
      const now = new Date();
      currentStart = new Date(now.getFullYear(), 0, 1);
      currentEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    }
    const baseWhere: any = {
      datetime: { [Op.between]: [currentStart, currentEnd] },
      category_guid: { [Op.not]: null },
    };

    if (office_guid) {
      baseWhere.office_guid = office_guid;
    }
    const currencyParam = toCurrency(currency);
    const countAllByCategory = await this.countAllSales(baseWhere, `${T}.category_guid`);
    const results = await this.totalCalculationModel.findAll({
      where: salesWhere(baseWhere, currencyParam),
      attributes: [
        'category_guid',
        [fn('COUNT', col('TotalCalculation.guid')), 'sales_count'],
        [sumOf(AMOUNT_SQL.sale(currencyParam)), 'total_sale'],
        [sumOf(AMOUNT_SQL.net(currencyParam)), 'total_net_price'],
        [sumOf(AMOUNT_SQL.profit(currencyParam)), 'total_profit'],
      ],
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['name'],
        },
      ],
      group: ['category_guid', 'category.guid', 'category.name'],
      order: [[fn('COUNT', col('TotalCalculation.guid')), 'DESC']],
      raw: true,
    });

    let overallTotalCount = 0;
    let overallTotalSale = 0;
    let overallTotalNetPrice = 0;
    let overallTotalProfit = 0;

    results.forEach((row: any) => {
      overallTotalCount += Number(row.sales_count || 0);
      overallTotalSale += Number(row.total_sale || 0);
      overallTotalNetPrice += Number(row.total_net_price || 0);
      overallTotalProfit += Number(row.total_profit || 0);
    });

    const items = results.map((row: any) => {
      const salesCount = Number(row.sales_count || 0);
      const totalSale = Number(row.total_sale || 0);
      const totalNetPrice = Number(row.total_net_price || 0);
      const totalProfit = Number(row.total_profit || 0);
      const percentage = overallTotalCount > 0 ? Math.round((salesCount / overallTotalCount) * 100) : 0;
      const margin = totalSale > 0 ? Number(((totalProfit / totalSale) * 100).toFixed(1)) : 0;

      return {
        category_guid: row.category_guid,
        category_name: row['category.name'] || 'Bilinmeyen Hizmat',
        sales_count: salesCount,
        count_all: countAllByCategory.get(String(row.category_guid)) || 0,
        percentage: percentage,
        sale_price: totalSale,
        net_price: totalNetPrice,
        profit: totalProfit,
        margin: margin,
      };
    });

    return {
      currency: currencyParam,
      totals: {
        sales_count: overallTotalCount,
        sale_price: overallTotalSale,
        net_price: overallTotalNetPrice,
        profit: overallTotalProfit,
        margin: overallTotalSale > 0 ? Number(((overallTotalProfit / overallTotalSale) * 100).toFixed(1)) : 0,
      },
      items: items,
    };
  }





  private calcPercentage(current: number, previous: number) {
    const diff = current - previous;
    let percentage = 0;

    if (previous === 0) {
      percentage = current > 0 ? 100 : 0;
    } else {
      percentage = Number(((diff / previous) * 100).toFixed(1));
    }
    return { difference: diff, percentage };
  }


  

  async getOfficesPerformanceData(filters: GetSummaryFilterDto) {
    const { start_date, end_date, period_preset, currency = 'TMT' } = filters;
    const currencyParam = toCurrency(currency);

    const now = new Date();
    let currentStart: Date;
    let currentEnd: Date;
    let previousStart: Date;
    let previousEnd: Date;
    if (period_preset === 'this_month') {
      currentStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      currentEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

      previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      previousEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    } else if (period_preset === 'last_month') {
      currentStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      currentEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

      previousStart = new Date(now.getFullYear(), now.getMonth() - 2, 1, 0, 0, 0, 0);
      previousEnd = new Date(now.getFullYear(), now.getMonth() - 1, 0, 23, 59, 59, 999);
    } else if (period_preset === 'last_3_months') {
      currentStart = new Date(now.getFullYear(), now.getMonth() - 3, 1, 0, 0, 0, 0);
      currentEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

      previousStart = new Date(now.getFullYear(), now.getMonth() - 7, 1, 0, 0, 0, 0);
      previousEnd = new Date(now.getFullYear(), now.getMonth() - 3, 0, 23, 59, 59, 999);
    } else if (period_preset === 'this_year') {
      currentStart = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      currentEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);

      previousStart = new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0, 0);
      previousEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
    } else if (start_date && end_date) {
      currentStart = new Date(start_date);
      currentStart.setHours(0, 0, 0, 0);
      currentEnd = new Date(end_date);
      currentEnd.setHours(23, 59, 59, 999);

      const diffTime = Math.abs(currentEnd.getTime() - currentStart.getTime());
      previousEnd = new Date(currentStart.getTime() - 1);
      previousStart = new Date(previousEnd.getTime() - diffTime);
    } else {
      currentStart = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      currentEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);

      previousStart = new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0, 0);
      previousEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
    }
    const offices = await Office.findAll({ raw: true });
    const currentResults = await this.totalCalculationModel.findAll({
      where: salesWhere({ datetime: { [Op.between]: [currentStart, currentEnd] } }, currencyParam),
      attributes: [
        'office_guid',
        [sumOf(AMOUNT_SQL.sale(currencyParam)), 'sale_price'],
        [sumOf(AMOUNT_SQL.net(currencyParam)), 'net_price'],
        [sumOf(AMOUNT_SQL.profit(currencyParam)), 'profit'],
      ],
      group: ['office_guid'],
      raw: true,
    });
    const previousResults = await this.totalCalculationModel.findAll({
      where: salesWhere({ datetime: { [Op.between]: [previousStart, previousEnd] } }, currencyParam),
      attributes: ['office_guid', [sumOf(AMOUNT_SQL.profit(currencyParam)), 'profit']],
      group: ['office_guid'],
      raw: true,
    });
    // Money out beside the cost of sales, per office, with the same meaning as
  // in getMoneyOut: salaries (locked months and USD bonuses) and kassa
  // expenses entered by hand or imported from Excel. Neither is a sale, so
  // they are read apart from the sales rows above.
    const net = `COALESCE(${T}.net_price, 0)`;
    const otherOutResults = await this.totalCalculationModel.findAll({
      where: { datetime: { [Op.between]: [currentStart, currentEnd] }, currency: currencyParam },
      attributes: [
        'office_guid',
        [sumOf(`CASE WHEN ${T}.category_guid = '${SYSTEM_CATEGORIES.SALARY}' THEN ${net} ELSE 0 END`), 'salary'],
        [sumOf(`CASE WHEN ${T}.source IN ('MANUAL', 'EXCEL') AND ${T}.type = 'EXPENSE' THEN ${net} ELSE 0 END`), 'expense'],
      ],
      group: ['office_guid'],
      raw: true,
    });
    const otherOutMap = new Map<string, any>();
    otherOutResults.forEach((row: any) => otherOutMap.set(row.office_guid, row));

    const currentMap = new Map<string, any>();
    currentResults.forEach((row: any) => currentMap.set(row.office_guid, row));

    const previousProfitMap = new Map<string, number>();
    previousResults.forEach((row: any) =>
      previousProfitMap.set(row.office_guid, Number(row.profit || 0)),
    );
    const totalSalePool = currentResults.reduce(
      (acc: number, row: any) => acc + Number(row.sale_price || 0),
      0,
    );
    const formattedOffices = offices.map((office: any) => {
      const currentStats = currentMap.get(office.guid) || {};
      const salePrice = Number(currentStats.sale_price || 0);
      const netPrice = Number(currentStats.net_price || 0);
      const profit = Number(currentStats.profit || 0);
      const otherOut = otherOutMap.get(office.guid) || {};

      const previousProfit = previousProfitMap.get(office.guid) || 0;
      let profitChangePercent = 0;

      if (previousProfit !== 0) {
        profitChangePercent = Number(
          (((profit - previousProfit) / Math.abs(previousProfit)) * 100).toFixed(1),
        );
      } else if (previousProfit === 0 && profit !== 0) {
        profitChangePercent = profit > 0 ? 100 : -100;
      } else {
        profitChangePercent = 0;
      }
      const officeSharePercent =
        totalSalePool > 0
          ? Number(((salePrice / totalSalePool) * 100).toFixed(1))
          : 0;

      return {
        office_guid: office.guid,
        name: office.fullName,
        share_percentage: `${officeSharePercent}%`,
        rawShare: officeSharePercent,
        profit,
        profit_change_percentage: profitChangePercent,
        sale_price: salePrice,
        net_price: netPrice,
        salary: round2(Number(otherOut.salary || 0)),
        expense: round2(Number(otherOut.expense || 0)),
      };
    });
    formattedOffices.sort((a, b) => b.rawShare - a.rawShare);
    return formattedOffices.map(({ rawShare, ...rest }, index) => ({
      rank: index + 1,
      ...rest,
    }));
  }



  async getCategoryAnalytics(filters: GetCategoryAnalyticsFilterDto) {
    const { start_date, end_date, period_preset, office_guid, category_guid, currency = 'TMT' } = filters;

    const now = new Date();
    let currentStart: Date;
    let currentEnd: Date;
    let prevStart: Date;
    let prevEnd: Date;

    let groupByInterval: Interval = 'day';
    if (period_preset === 'this_month') {
      groupByInterval = 'day';
      currentStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      currentEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

      prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    } else if (period_preset === 'last_month') {
      groupByInterval = 'day';
      currentStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      currentEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

      prevStart = new Date(now.getFullYear(), now.getMonth() - 2, 1, 0, 0, 0, 0);
      prevEnd = new Date(now.getFullYear(), now.getMonth() - 1, 0, 23, 59, 59, 999);
    } else if (period_preset === 'last_3_months') {
      groupByInterval = 'week';
      currentStart = new Date(now.getFullYear(), now.getMonth() - 3, 1, 0, 0, 0, 0);
      currentEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

      const durationMs = currentEnd.getTime() - currentStart.getTime();
      prevEnd = new Date(currentStart.getTime() - 1);
      prevStart = new Date(prevEnd.getTime() - durationMs);
    } else if (period_preset === 'this_year') {
      groupByInterval = 'month';
      currentStart = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      currentEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);

      prevStart = new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0, 0);
      prevEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
    } else if (start_date && end_date) {
      currentStart = new Date(start_date);
      currentStart.setHours(0, 0, 0, 0);
      currentEnd = new Date(end_date);
      currentEnd.setHours(23, 59, 59, 999);
      groupByInterval = intervalFor(currentStart, currentEnd);

      const durationMs = currentEnd.getTime() - currentStart.getTime();
      prevEnd = new Date(currentStart.getTime() - 1);
      prevStart = new Date(prevEnd.getTime() - durationMs);
    } else {
      groupByInterval = 'day';
      currentStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      currentEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

      prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    }
    const currencyParam = toCurrency(currency);
    const buildWhere = (start: Date, end: Date) => {
      const where: any = {
        datetime: { [Op.between]: [start, end] },
      };

      if (office_guid) where.office_guid = office_guid;
      if (category_guid) where.category_guid = category_guid;

      return salesWhere(where, currencyParam);
    };
    const saleExpr = `COALESCE(SUM(${AMOUNT_SQL.sale(currencyParam)}), 0)`;
    const creditExpr = `COALESCE(SUM(${AMOUNT_SQL.credit(currencyParam)}), 0)`;
    const profitExpr = `COALESCE(SUM(${AMOUNT_SQL.profit(currencyParam)}), 0)`;
    const refundCountExpr = `COUNT(CASE WHEN status = 'REFUND' THEN 1 END)`;
    const timeLabelLiteral = literal(bucketKeySql(groupByInterval));
    const [currentPeriodData, prevPeriodData, overallTotals, prevOverallTotals] = await Promise.all([
      this.totalCalculationModel.findAll({
        where: buildWhere(currentStart, currentEnd),
        attributes: [
          [timeLabelLiteral, 'time_label'],
          [literal(saleExpr), 'total_sale'],
          [literal(profitExpr), 'total_profit'],
        ],
        group: [timeLabelLiteral as any],
        order: [[timeLabelLiteral as any, 'ASC']],
        raw: true,
      }),
      this.totalCalculationModel.findAll({
        where: buildWhere(prevStart, prevEnd),
        attributes: [
          [timeLabelLiteral, 'time_label'],
          [literal(saleExpr), 'total_sale'],
        ],
        group: [timeLabelLiteral as any],
        order: [[timeLabelLiteral as any, 'ASC']],
        raw: true,
      }),
      this.totalCalculationModel.findOne({
        where: buildWhere(currentStart, currentEnd),
        attributes: [
          [literal(saleExpr), 'total_sale'],
          [literal(profitExpr), 'total_profit'],
          [literal(creditExpr), 'total_credit'],
          [literal('COUNT(*)'), 'total_count'],
          [literal(refundCountExpr), 'total_refund_count'],
        ],
        raw: true,
      }),
      this.totalCalculationModel.findOne({
        where: buildWhere(prevStart, prevEnd),
        attributes: [
          [literal(saleExpr), 'total_sale'],
          [literal(profitExpr), 'total_profit'],
        ],
        raw: true,
      }),
    ]);
    const currentTotalSale = Number(overallTotals?.['total_sale'] || 0);
    const currentTotalProfit = Number(overallTotals?.['total_profit'] || 0);
    const currentTotalCredit = Number(overallTotals?.['total_credit'] || 0);
    const currentTotalCount = Number(overallTotals?.['total_count'] || 0);
    const currentTotalRefundCount = Number(overallTotals?.['total_refund_count'] || 0);

    const prevTotalSale = Number(prevOverallTotals?.['total_sale'] || 0);
    const prevTotalProfit = Number(prevOverallTotals?.['total_profit'] || 0);
    let salePercentageDiff = 0;
    if (prevTotalSale > 0) {
      salePercentageDiff = Number((((currentTotalSale - prevTotalSale) / prevTotalSale) * 100).toFixed(1));
    } else if (currentTotalSale > 0) {
      salePercentageDiff = 100;
    }
    let profitPercentageDiff = 0;
    if (prevTotalProfit !== 0) {
      profitPercentageDiff = Number((((currentTotalProfit - prevTotalProfit) / Math.abs(prevTotalProfit)) * 100).toFixed(1));
    } else if (currentTotalProfit > 0) {
      profitPercentageDiff = 100;
    } else if (currentTotalProfit < 0) {
      profitPercentageDiff = -100;
    }
    // Every bucket key of a range, in order, matching bucketKeySql; weeks start on Monday.
    const pad = (n: number) => String(n).padStart(2, '0');
    const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const generateKeys = (start: Date, end: Date, interval: Interval) => {
      const keys: string[] = [];
      const iter = new Date(start.getFullYear(), start.getMonth(), interval === 'month' ? 1 : start.getDate());
      if (interval === 'week') iter.setDate(iter.getDate() - ((iter.getDay() + 6) % 7));
      while (iter <= end) {
        keys.push(interval === 'month' ? dayKey(iter).slice(0, 7) : dayKey(iter));
        if (interval === 'month') iter.setMonth(iter.getMonth() + 1);
        else iter.setDate(iter.getDate() + (interval === 'week' ? 7 : 1));
      }
      return keys;
    };
    // Display label: "DD.MM" (with the year when the range spans two), "MM.YYYY" per month.
    const spansYears = currentStart.getFullYear() !== currentEnd.getFullYear();
    const labelOf = (key: string) => {
      const [y, m, d] = key.split('-');
      if (!d) return `${m}.${y}`;
      return spansYears ? `${d}.${m}.${y.slice(2)}` : `${d}.${m}`;
    };
    const currentDataMap = new Map<string, { sale: number; profit: number }>();
    currentPeriodData.forEach((row: any) => {
      currentDataMap.set(row.time_label, {
        sale: Number(row.total_sale || 0),
        profit: Number(row.total_profit || 0),
      });
    });

    const prevDataMap = new Map<string, number>();
    prevPeriodData.forEach((row: any) => {
      prevDataMap.set(row.time_label, Number(row.total_sale || 0));
    });
    const currentKeys = generateKeys(currentStart, currentEnd, groupByInterval);
    const prevKeys = generateKeys(prevStart, prevEnd, groupByInterval);

    // The previous period lines up bucket by bucket (1st day with 1st day).
    const chart = currentKeys.map((key, index) => {
      const currData = currentDataMap.get(key) || { sale: 0, profit: 0 };
      const prevKey = prevKeys[index];
      const prevSale = prevKey ? (prevDataMap.get(prevKey) || 0) : 0;

      return {
        key,
        label: labelOf(key),
        sale: currData.sale,
        profit: currData.profit,
        prev_sale: prevSale,
      };
    });

    return {
      currency: currencyParam,
      total_sale: currentTotalSale,
      total_profit: currentTotalProfit,
      total_credit: currentTotalCredit,
      total_count: currentTotalCount,
      total_refund_count: currentTotalRefundCount,
      comparison: {
        sale_percentage: salePercentageDiff,
        profit_percentage: profitPercentageDiff,
      },
      chart,
    };
  }
}