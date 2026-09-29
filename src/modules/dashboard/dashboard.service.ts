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

    const currencyParam = (currency as 'USD' | 'TMT') || 'TMT';

    const currentUsdData = await this.calculateMetrics(baseWhere, 'USD', currencyParam);
    const prevUsdData = await this.calculateMetrics(prevWhere, 'USD', currencyParam);
    const currentTmtData = await this.calculateMetrics(baseWhere, 'TMT', currencyParam);
    const prevTmtData = await this.calculateMetrics(prevWhere, 'TMT', currencyParam);
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
    };
  }





  private async calculateMetrics(
    whereCondition: any,
    currencyType: 'USD' | 'TMT',
    filterCurrency?: 'USD' | 'TMT'
  ) {
    const activeCountCurrency = filterCurrency || currencyType;

    const countExpression = activeCountCurrency === 'USD'
      ? literal(`COUNT(CASE WHEN currency = 'USD' OR COALESCE(sale_price_usd, 0) > 0 OR COALESCE(credit_usd, 0) > 0 THEN 1 END)`)
      : literal(`COUNT(CASE WHEN currency = 'TMT' THEN 1 END)`);

    const saleColExpression = currencyType === 'USD'
      ? literal(`SUM(CASE WHEN currency = 'USD' THEN COALESCE(sale_price, 0) ELSE 0 END + COALESCE(sale_price_usd, 0))`)
      : literal(`SUM(CASE WHEN currency = 'TMT' THEN COALESCE(sale_price, 0) ELSE 0 END)`);

    const creditColExpression = currencyType === 'USD'
      ? literal(`SUM(CASE WHEN currency = 'USD' THEN COALESCE(credit_price, 0) ELSE 0 END + COALESCE(credit_usd, 0))`)
      : literal(`SUM(CASE WHEN currency = 'TMT' THEN COALESCE(credit_price, 0) ELSE 0 END)`);

    const netPriceColExpression = currencyType === 'USD'
      ? literal(`SUM(CASE WHEN currency = 'USD' THEN COALESCE(net_price, 0) ELSE 0 END)`)
      : literal(`SUM(CASE WHEN currency = 'TMT' THEN COALESCE(net_price, 0) ELSE 0 END)`);

    const profitColExpression = currencyType === 'USD'
      ? literal(`SUM(CASE WHEN currency = 'USD' THEN COALESCE(profit, 0) ELSE 0 END)`)
      : literal(`SUM(CASE WHEN currency = 'TMT' THEN COALESCE(profit, 0) ELSE 0 END)`);

    const result = await this.totalCalculationModel.findOne({
      where: whereCondition,
      attributes: [
        [countExpression, 'count'],
        [saleColExpression, 'totalSale'],
        [creditColExpression, 'totalCredit'],
        [netPriceColExpression, 'totalNetPrice'],
        [profitColExpression, 'totalProfit'],
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




  async getDashboardChartData(filters: GetSummaryFilterDto) {
    const { start_date, end_date, period_preset, office_guid, currency = 'TMT' } = filters;
    const currencyParam = currency || 'TMT';

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
      groupType = 'day';
    } else {
      const now = new Date();
      currentStart = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      currentEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      groupType = 'month';
    }
    const buildCurrencyFilter = () => {
      if (currencyParam === 'USD') {
        return {
          [Op.or]: [
            { currency: 'USD' },
            { [Op.and]: [{ currency: 'TMT' }, { sale_price_usd: { [Op.gt]: 0 } }] },
          ],
        };
      }
      return { currency: 'TMT' };
    };
    const priorWhere: any = {
      datetime: { [Op.lt]: currentStart },
      ...buildCurrencyFilter(),
    };
    if (office_guid) priorWhere.office_guid = office_guid;
    const baseWhere: any = {
      datetime: { [Op.between]: [currentStart, currentEnd] },
      ...buildCurrencyFilter(),
    };
    if (office_guid) baseWhere.office_guid = office_guid;
    const priorSumResult = await this.totalCalculationModel.findOne({
      where: priorWhere,
      attributes: [[fn('SUM', col('profit')), 'total_prior_profit']],
      raw: true,
    });

    let runningAccumulatedProfit = Number((priorSumResult as any)?.total_prior_profit || 0);
    let groupFormat = 'YYYY-MM-DD';
    if (groupType === 'week') {
      groupFormat = 'IYYY-IW';
    } else if (groupType === 'month') {
      groupFormat = 'YYYY-MM';
    }
    const formattedDateLiteral = literal(`TO_CHAR(datetime, '${groupFormat}')`);
    const saleColExpression = currencyParam === 'USD'
      ? literal(`SUM(CASE WHEN currency = 'USD' THEN COALESCE(sale_price, 0) ELSE COALESCE(sale_price_usd, 0) END)`)
      : literal('SUM(COALESCE(sale_price, 0))');

    const netPriceColExpression = literal('SUM(COALESCE(net_price, 0))');
    const profitColExpression = literal('SUM(COALESCE(profit, 0))');
    const results = await this.totalCalculationModel.findAll({
      where: baseWhere,
      attributes: [
        [formattedDateLiteral, 'period'],
        [fn('COUNT', col('guid')), 'sales_count'],
        [saleColExpression, 'sale_price'],
        [netPriceColExpression, 'net_price'],
        [profitColExpression, 'profit'],
      ],
      group: [formattedDateLiteral as any],
      order: [[formattedDateLiteral as any, 'ASC']],
      raw: true,
    });
    const dataMap = new Map<string, any>();
    results.forEach((row: any) => {
      dataMap.set(row.period, {
        sales_count: Number(row.sales_count || 0),
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
      iterDate = new Date(currentStart.getFullYear(), 0, 1);
      const endYear = currentEnd.getFullYear();
      while (iterDate.getFullYear() <= endYear && iterDate <= currentEnd) {
        const year = iterDate.getFullYear();
        const month = String(iterDate.getMonth() + 1).padStart(2, '0');
        const periodStr = `${year}-${month}`;

        const currentMonthData = dataMap.get(periodStr) || {
          sales_count: 0,
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
    const currencyParam: 'USD' | 'TMT' = (currency as 'USD' | 'TMT') || 'TMT';

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

    if (currencyParam === 'USD') {
      baseWhere[Op.or] = [
        { currency: 'USD' },
        { sale_price_usd: { [Op.gt]: 0 } },
        { credit_usd: { [Op.gt]: 0 } },
      ];
    } else {
      baseWhere.currency = 'TMT';
    }

    if (office_guid) {
      baseWhere.office_guid = office_guid;
    }

    const saleColExpression = currencyParam === 'USD'
      ? literal('SUM(CASE WHEN currency = \'USD\' THEN COALESCE(sale_price, 0) ELSE 0 END + COALESCE(sale_price_usd, 0))')
      : literal('SUM(CASE WHEN currency = \'TMT\' THEN COALESCE(sale_price, 0) ELSE 0 END)');

    const results = await this.totalCalculationModel.findAll({
      where: baseWhere,
      attributes: [
        'status',
        [fn('COUNT', col('guid')), 'count'],
        [saleColExpression, 'total_sale'],
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

    const formatStatusItem = (item: { count: number; total_sale: number }) => {
      const percentage = overallTotalCount > 0 ? Math.round((item.count / overallTotalCount) * 100) : 0;
      return {
        count: item.count,
        total_sale: item.total_sale,
        percentage: percentage,
      };
    };

    return {
      currency: currencyParam,
      statuses: {
        paid: formatStatusItem(statusMap['paid']),
        notpaid: formatStatusItem(statusMap['notpaid']),
        refund: formatStatusItem(statusMap['REFUND']),
        no_status: formatStatusItem(statusMap['null']),
      },
    };
  }




  async getOperatorsRanking(filters: GetCategoryAnalyticsFilterDto) {
    const { start_date, end_date, period_preset, office_guid, category_guid, currency = 'TMT' } = filters;
    const currencyParam: 'USD' | 'TMT' = currency || 'TMT';

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

    if (currencyParam === 'USD') {
      baseWhere[Op.or] = [
        { currency: 'USD' },
        { [Op.and]: [{ currency: 'TMT' }, { sale_price_usd: { [Op.gt]: 0 } }] }
      ];
    } else {
      baseWhere.currency = 'TMT';
    }
    const saleColExpression = currencyParam === 'USD'
      ? literal(`SUM(CASE WHEN currency = 'USD' THEN COALESCE(sale_price, 0) ELSE COALESCE(sale_price_usd, 0) END)`)
      : literal('SUM(COALESCE(sale_price, 0))');

    const profitColExpression = literal('SUM(COALESCE(profit, 0))');

    const results = await this.totalCalculationModel.findAll({
      where: baseWhere,
      attributes: [
        'receiver_opr_guid',
        [fn('COUNT', col('TotalCalculation.guid')), 'sales_count'],
        [saleColExpression, 'total_sale'],
        [profitColExpression, 'total_profit'],
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
    if (currency === 'USD') {
      baseWhere[Op.or] = [
        { currency: 'USD' },
        { sale_price_usd: { [Op.gt]: 0 } },
      ];
    } else {
      baseWhere.currency = 'TMT';
    }
    const saleColExpression = currency === 'USD'
      ? literal('SUM(CASE WHEN currency = \'USD\' THEN COALESCE(sale_price, 0) ELSE COALESCE(sale_price_usd, 0) END)')
      : literal('SUM(COALESCE(sale_price, 0))');

    const netPriceColExpression = currency === 'USD'
      ? literal('SUM(CASE WHEN currency = \'USD\' THEN COALESCE(net_price, 0) ELSE 0 END)')
      : literal('SUM(COALESCE(net_price, 0))');

    const profitColExpression = currency === 'USD'
      ? literal('SUM(CASE WHEN currency = \'USD\' THEN COALESCE(profit, 0) ELSE (COALESCE(sale_price_usd, 0) - COALESCE(net_price, 0)) END)')
      : literal('SUM(COALESCE(profit, 0))');

    const results = await this.totalCalculationModel.findAll({
      where: baseWhere,
      attributes: [
        'category_guid',
        [fn('COUNT', col('TotalCalculation.guid')), 'sales_count'],
        [saleColExpression, 'total_sale'],
        [netPriceColExpression, 'total_net_price'],
        [profitColExpression, 'total_profit'],
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
        percentage: percentage,
        sale_price: totalSale,
        net_price: totalNetPrice,
        profit: totalProfit,
        margin: margin,
      };
    });

    return {
      currency: currency,
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
    const currencyParam = currency || 'TMT';

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
    const buildCurrencyWhere = () => {
      if (currencyParam === 'USD') {
        return {
          [Op.or]: [
            { currency: 'USD' },
            { [Op.and]: [{ currency: 'TMT' }, { sale_price_usd: { [Op.gt]: 0 } }] },
          ],
        };
      }
      return { currency: 'TMT' };
    };

    const saleColExpression =
      currencyParam === 'USD'
        ? literal(
          `SUM(CASE WHEN currency = 'USD' THEN COALESCE(sale_price, 0) ELSE COALESCE(sale_price_usd, 0) END)`,
        )
        : literal('SUM(COALESCE(sale_price, 0))');

    const netPriceColExpression = literal('SUM(COALESCE(net_price, 0))');
    const profitColExpression = literal('SUM(COALESCE(profit, 0))');
    const offices = await Office.findAll({ raw: true });
    const currentResults = await this.totalCalculationModel.findAll({
      where: {
        datetime: { [Op.between]: [currentStart, currentEnd] },
        ...buildCurrencyWhere(),
      },
      attributes: [
        'office_guid',
        [saleColExpression, 'sale_price'],
        [netPriceColExpression, 'net_price'],
        [profitColExpression, 'profit'],
      ],
      group: ['office_guid'],
      raw: true,
    });
    const previousResults = await this.totalCalculationModel.findAll({
      where: {
        datetime: { [Op.between]: [previousStart, previousEnd] },
        ...buildCurrencyWhere(),
      },
      attributes: ['office_guid', [profitColExpression, 'profit']],
      group: ['office_guid'],
      raw: true,
    });
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

    let groupByInterval: 'day' | 'week' | 'month' = 'day';
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
      groupByInterval = 'day';
      currentStart = new Date(start_date);
      currentEnd = new Date(end_date);
      currentEnd.setHours(23, 59, 59, 999);

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
    const buildWhere = (start: Date, end: Date) => {
      const where: any = {
        datetime: { [Op.between]: [start, end] },
      };

      if (office_guid) where.office_guid = office_guid;
      if (category_guid) where.category_guid = category_guid;

      if (currency === 'USD') {
        where[Op.or] = [
          { currency: 'USD' },
          { [Op.and]: [{ currency: 'TMT' }, { sale_price_usd: { [Op.gt]: 0 } }] }
        ];
      } else {
        where.currency = 'TMT';
      }

      return where;
    };
    const saleExpr = currency === 'USD'
      ? `SUM(CASE WHEN currency = 'USD' THEN COALESCE(sale_price, 0) ELSE COALESCE(sale_price_usd, 0) END)`
      : `SUM(COALESCE(sale_price, 0))`;

    const creditExpr = currency === 'USD'
      ? `SUM(CASE WHEN currency = 'USD' THEN COALESCE(credit_price, 0) ELSE COALESCE(credit_usd, 0) END)`
      : `SUM(COALESCE(credit_price, 0))`;

    const profitExpr = `SUM(COALESCE(profit, 0))`;
    const refundCountExpr = `COUNT(CASE WHEN status = 'REFUND' THEN 1 END)`;
    let dateFormat = "TO_CHAR(datetime, 'DD.MM')";
    if (groupByInterval === 'month') {
      dateFormat = "TO_CHAR(datetime, 'MM.YYYY')";
    } else if (groupByInterval === 'week') {
      dateFormat = "TO_CHAR(DATE_TRUNC('week', datetime), 'DD.MM')";
    }

    const timeLabelLiteral = literal(dateFormat);
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
    const generateLabels = (start: Date, end: Date, interval: 'day' | 'week' | 'month') => {
      const labels: string[] = [];
      const iter = new Date(start);

      if (interval === 'day') {
        while (iter <= end) {
          const dd = String(iter.getDate()).padStart(2, '0');
          const mm = String(iter.getMonth() + 1).padStart(2, '0');
          labels.push(`${dd}.${mm}`);
          iter.setDate(iter.getDate() + 1);
        }
      } else if (interval === 'month') {
        while (iter <= end) {
          const mm = String(iter.getMonth() + 1).padStart(2, '0');
          const yyyy = iter.getFullYear();
          labels.push(`${mm}.${yyyy}`);
          iter.setMonth(iter.getMonth() + 1);
        }
      } else if (interval === 'week') {
        const dayOfWeek = iter.getDay();
        const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        iter.setDate(iter.getDate() + diffToMonday);

        while (iter <= end) {
          const dd = String(iter.getDate()).padStart(2, '0');
          const mm = String(iter.getMonth() + 1).padStart(2, '0');
          const label = `${dd}.${mm}`;
          if (!labels.includes(label)) {
            labels.push(label);
          }
          iter.setDate(iter.getDate() + 7);
        }
      }
      return labels;
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
    const currentLabels = generateLabels(currentStart, currentEnd, groupByInterval);
    const prevLabels = generateLabels(prevStart, prevEnd, groupByInterval);

    const chart = currentLabels.map((label, index) => {
      const currData = currentDataMap.get(label) || { sale: 0, profit: 0 };
      const prevLabel = prevLabels[index];
      const prevSale = prevLabel ? (prevDataMap.get(prevLabel) || 0) : 0;

      return {
        label,
        sale: currData.sale,
        profit: currData.profit,
        prev_sale: prevSale,
      };
    });

    return {
      currency,
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