import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op, fn, col, literal } from 'sequelize';
import { TotalCalculation } from '../total_calculations/entities/total_calculation.entity';
import { GetSummaryFilterDto } from './dto/dashboard-filter.dto';
import { Sequelize } from 'sequelize-typescript';
import { Employee } from '../employee/entities/employee.entity';
import { Category } from '../category/entities/category.entity';
import { Office } from '../office/entities/office.entity';

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




  async getDashboardChartData(filters: GetSummaryFilterDto & { currency?: 'USD' | 'TMT' }) {
    let { start_date, end_date, period_preset, office_guid, currency = 'TMT' } = filters;

    let currentStart: Date = new Date();
    let currentEnd: Date = new Date();
    let groupType: 'day' | 'week' | 'month' = 'day';

    if (period_preset) {
      const now = new Date();
      if (period_preset === 'this_month') {
        currentStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
        currentEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        groupType = 'day';
      } else if (period_preset === 'last_month') {
        currentStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
        currentEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        groupType = 'day';
      } else if (period_preset === 'last_3_months') {
        currentStart = new Date(now.getFullYear(), now.getMonth() - 3, 1, 0, 0, 0);
        currentEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        groupType = 'week';
      } else if (period_preset === 'this_year') {
        currentStart = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
        currentEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
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
      currentStart = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
      currentEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
      groupType = 'month';
    }
    const priorWhere: any = {
      datetime: { [Op.lt]: currentStart },
      currency: currency,
    };
    if (office_guid) {
      priorWhere.office_guid = office_guid;
    }

    const priorSumResult = await this.totalCalculationModel.findOne({
      where: priorWhere,
      attributes: [[fn('SUM', col('profit')), 'total_prior_profit']],
      raw: true,
    });

    let runningAccumulatedProfit = Number((priorSumResult as any)?.total_prior_profit || 0);
    const baseWhere: any = {
      datetime: { [Op.between]: [currentStart, currentEnd] },
      currency: currency,
    };

    if (office_guid) {
      baseWhere.office_guid = office_guid;
    }

    let groupFormat = 'YYYY-MM-DD';
    if (groupType === 'week') {
      groupFormat = 'IYYY-IW';
    } else if (groupType === 'month') {
      groupFormat = 'YYYY-MM';
    }
    const formattedDateLiteral = literal(`TO_CHAR(datetime, '${groupFormat}')`);

    const saleColExpression = currency === 'USD'
      ? literal('COALESCE(sale_price, 0) + COALESCE(sale_price_usd, 0)')
      : col('sale_price');

    const creditColExpression = currency === 'USD'
      ? literal('COALESCE(credit_price, 0) + COALESCE(credit_usd, 0)')
      : col('credit_price');

    const netPriceColExpression = currency === 'USD'
      ? literal('COALESCE(net_price, 0)')
      : col('net_price');

    const results = await this.totalCalculationModel.findAll({
      where: baseWhere,
      attributes: [
        [formattedDateLiteral, 'period'],
        [fn('COUNT', col('guid')), 'sales_count'],
        [fn('SUM', saleColExpression), 'sale_price'],
        [fn('SUM', creditColExpression), 'credit_price'],
        [fn('SUM', netPriceColExpression), 'net_price'],
        [fn('SUM', col('profit')), 'profit'],
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
        credit_price: Number(row.credit_price || 0),
        net_price: Number(row.net_price || 0),
        profit: Number(row.profit || 0),
        currency: currency,
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

        let currentDayData = dataMap.get(periodStr) || {
          sales_count: 0,
          sale_price: 0,
          credit_price: 0,
          net_price: 0,
          profit: 0,
          currency: currency,
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

        let currentMonthData = dataMap.get(periodStr) || {
          sales_count: 0,
          sale_price: 0,
          credit_price: 0,
          net_price: 0,
          profit: 0,
          currency: currency,
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
        let rowProfit = Number(row.profit || 0);
        runningAccumulatedProfit += rowProfit;

        filledResults.push({
          period: row.period,
          sales_count: Number(row.sales_count || 0),
          sale_price: Number(row.sale_price || 0),
          credit_price: Number(row.credit_price || 0),
          net_price: Number(row.net_price || 0),
          profit: rowProfit,
          last_profit: runningAccumulatedProfit,
          currency: currency,
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




  async getOperatorsRanking(filters: GetSummaryFilterDto & { currency?: 'USD' | 'TMT' }) {
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
      receiver_opr_guid: { [Op.not]: null },
    };
    if (currencyParam === 'USD') {
      baseWhere[Op.and] = literal(
        `(currency = 'USD' OR COALESCE(sale_price_usd, 0) > 0)`
      );
    } else {
      baseWhere.currency = 'TMT';
    }

    if (office_guid) {
      baseWhere.office_guid = office_guid;
    }
    const saleColExpression = currencyParam === 'USD'
      ? literal('SUM(CASE WHEN currency = \'USD\' THEN COALESCE(sale_price, 0) ELSE 0 END + COALESCE(sale_price_usd, 0))')
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
    let overallTotalProfit = 0;
    results.forEach((row: any) => {
      overallTotalProfit += Number(row.total_profit || 0);
    });
    const mappedResults = results.map((row: any) => {
      const salesCount = Number(row.sales_count || 0);
      const profit = Number(row.total_profit || 0);
      const percentage = overallTotalProfit > 0
        ? Math.round((profit / overallTotalProfit) * 100)
        : 0;

      return {
        operator_guid: row.receiver_opr_guid,
        operator_name: row['receiver_operator.fullName'] || 'Bilinmeyen Operatör',
        sales_count: salesCount,
        percentage: percentage,
        sale_price: Number(row.total_sale || 0),
        profit: profit,
      };
    });
    return mappedResults.sort((a, b) => b.percentage - a.percentage);
  }



  async getCategoriesRanking(filters: GetSummaryFilterDto & { currency?: 'USD' | 'TMT' }) {
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

    const baseWhere: any = {
      datetime: { [Op.between]: [currentStart, currentEnd] },
      category_guid: { [Op.not]: null },
      currency: currency,
    };

    if (office_guid) {
      baseWhere.office_guid = office_guid;
    }
    const saleColExpression = currency === 'USD'
      ? literal('COALESCE(sale_price, 0) + COALESCE(sale_price_usd, 0)')
      : col('sale_price');

    const netPriceColExpression = currency === 'USD'
      ? literal('COALESCE(net_price, 0)')
      : col('net_price');

    const profitColExpression = col('profit');

    const results = await this.totalCalculationModel.findAll({
      where: baseWhere,
      attributes: [
        'category_guid',
        [fn('COUNT', col('TotalCalculation.guid')), 'sales_count'],
        [fn('SUM', saleColExpression), 'total_sale'],
        [fn('SUM', netPriceColExpression), 'total_net_price'],
        [fn('SUM', profitColExpression), 'total_profit'],
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
        category_name: row['category.name'] || 'Bilinmeyen Hýzmat',
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




  async getOfficesSummaryData(filters: GetSummaryFilterDto) {
    let { start_date, end_date, period_preset } = filters;
    let currentStart: Date = new Date();
    let currentEnd: Date = new Date();
    if (period_preset) {
      const now = new Date();
      if (period_preset === 'this_month') {
        currentStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
        currentEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      } else if (period_preset === 'last_month') {
        currentStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
        currentEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      } else if (period_preset === 'last_3_months') {
        currentStart = new Date(now.getFullYear(), now.getMonth() - 3, 1, 0, 0, 0);
        currentEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      } else if (period_preset === 'this_year') {
        currentStart = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
        currentEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
      }
    } else if (start_date && end_date) {
      currentStart = new Date(start_date);
      currentStart.setHours(0, 0, 0, 0);
      currentEnd = new Date(end_date);
      currentEnd.setHours(23, 59, 59, 999);
    } else {
      const now = new Date();
      currentStart = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
      currentEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
    }
    const offices = await Office.findAll({ raw: true });
    const results = await this.totalCalculationModel.findAll({
      where: {
        datetime: { [Op.between]: [currentStart, currentEnd] },
      },
      attributes: [
        'office_guid',
        [
          fn(
            'SUM',
            literal(
              `CASE WHEN currency = 'USD' THEN COALESCE(sale_price, 0) ELSE 0 END + COALESCE(sale_price_usd, 0)`
            )
          ),
          'sale_price_usd',
        ],
        [
          fn(
            'SUM',
            literal(
              `CASE WHEN currency = 'TMT' THEN COALESCE(sale_price, 0) ELSE 0 END`
            )
          ),
          'sale_price_tmt',
        ],
        [
          fn(
            'SUM',
            literal(
              `CASE WHEN currency = 'USD' THEN COALESCE(net_price, 0) ELSE 0 END`
            )
          ),
          'net_price_usd',
        ],
        [
          fn(
            'SUM',
            literal(
              `CASE WHEN currency = 'TMT' THEN COALESCE(net_price, 0) ELSE 0 END`
            )
          ),
          'net_price_tmt',
        ],
        [
          fn(
            'SUM',
            literal(
              `CASE WHEN currency = 'USD' THEN COALESCE(credit_price, 0) ELSE 0 END + COALESCE(credit_usd, 0)`
            )
          ),
          'credit_price_usd',
        ],
        [
          fn(
            'SUM',
            literal(
              `CASE WHEN currency = 'TMT' THEN COALESCE(credit_price, 0) ELSE 0 END`
            )
          ),
          'credit_price_tmt',
        ],
        [
          fn(
            'SUM',
            literal(
              `CASE WHEN currency = 'USD' THEN COALESCE(profit, 0) ELSE 0 END`
            )
          ),
          'profit_usd',
        ],
        [
          fn(
            'SUM',
            literal(
              `CASE WHEN currency = 'TMT' THEN COALESCE(profit, 0) ELSE 0 END`
            )
          ),
          'profit_tmt',
        ],
      ],
      group: ['office_guid'],
      raw: true,
    });
    const dataMap = new Map();
    results.forEach((row: any) => {
      dataMap.set(row.office_guid, row);
    });

    let grandTotalSaleUsd = 0;
    let grandTotalSaleTmt = 0;
    let grandTotalNetUsd = 0;
    let grandTotalNetTmt = 0;
    let grandTotalCreditUsd = 0;
    let grandTotalCreditTmt = 0;
    let grandTotalProfitUsd = 0;
    let grandTotalProfitTmt = 0;
    const totalSalePool = results.reduce((acc: number, row: any) => {
      return acc + Number(row.sale_price_usd || 0) + Number(row.sale_price_tmt || 0);
    }, 0);
    const formattedOffices = offices.map((office: any) => {
      const stats = dataMap.get(office.guid) || {};

      const saleUsd = Number(stats.sale_price_usd || 0);
      const saleTmt = Number(stats.sale_price_tmt || 0);
      const netUsd = Number(stats.net_price_usd || 0);
      const netTmt = Number(stats.net_price_tmt || 0);
      const creditUsd = Number(stats.credit_price_usd || 0);
      const creditTmt = Number(stats.credit_price_tmt || 0);
      const profitUsd = Number(stats.profit_usd || 0);
      const profitTmt = Number(stats.profit_tmt || 0);

      grandTotalSaleUsd += saleUsd;
      grandTotalSaleTmt += saleTmt;
      grandTotalNetUsd += netUsd;
      grandTotalNetTmt += netTmt;
      grandTotalCreditUsd += creditUsd;
      grandTotalCreditTmt += creditTmt;
      grandTotalProfitUsd += profitUsd;
      grandTotalProfitTmt += profitTmt;

      const officeTotal = saleUsd + saleTmt;
      const percentageNum = totalSalePool > 0 ? Math.round((officeTotal / totalSalePool) * 100) : 0;

      return {
        office_guid: office.guid,
        name: office.fullName,
        rawPercentage: percentageNum,
        percentage: `${percentageNum}%`,
        sale_price: {
          usd: saleUsd,
          tmt: saleTmt,
        },
        net_price: {
          usd: netUsd,
          tmt: netTmt,
        },
        credit_price: {
          usd: creditUsd,
          tmt: creditTmt,
        },
        profit: {
          usd: profitUsd,
          tmt: profitTmt,
        },
      };
    });
    formattedOffices.sort((a, b) => b.rawPercentage - a.rawPercentage);
    const sortedOffices = formattedOffices.map(({ rawPercentage, ...rest }) => rest);

    return {
      offices: sortedOffices,
      jemi: {
        sale_price: {
          usd: grandTotalSaleUsd,
          tmt: grandTotalSaleTmt,
        },
        net_price: {
          usd: grandTotalNetUsd,
          tmt: grandTotalNetTmt,
        },
        credit_price: {
          usd: grandTotalCreditUsd,
          tmt: grandTotalCreditTmt,
        },
        profit: {
          usd: grandTotalProfitUsd,
          tmt: grandTotalProfitTmt,
        },
      },
    };
  }
}