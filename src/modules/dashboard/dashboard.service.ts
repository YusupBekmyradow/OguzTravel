import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op, fn, col, literal } from 'sequelize';
import { TotalCalculation } from '../total_calculations/entities/total_calculation.entity';
import { GetSummaryFilterDto } from './dto/dashboard-filter.dto';
import { Sequelize } from 'sequelize-typescript';
import { Employee } from '../employee/entities/employee.entity';
import { Category } from '../category/entities/category.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(TotalCalculation)
    private readonly totalCalculationModel: typeof TotalCalculation,
    private readonly sequelize: Sequelize,
  ) { }

  async getDashboardSummary(filters: GetSummaryFilterDto) {
    let { start_date, end_date, period_preset, office_guid } = filters;
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
    const currentUsdData = await this.calculateMetrics(baseWhere, 'USD');
    const prevUsdData = await this.calculateMetrics(prevWhere, 'USD');
    const currentTmtData = await this.calculateMetrics(baseWhere, 'TMT');
    const prevTmtData = await this.calculateMetrics(prevWhere, 'TMT');

    const salesCountStats = this.calcPercentage(currentUsdData.count, prevUsdData.count);
    const salePriceUsdStats = this.calcPercentage(currentUsdData.totalSale, prevUsdData.totalSale);
    const salePriceTmtStats = this.calcPercentage(currentTmtData.totalSale, prevTmtData.totalSale);
    const creditUsdStats = this.calcPercentage(currentUsdData.totalCredit, prevUsdData.totalCredit);
    const creditTmtStats = this.calcPercentage(currentTmtData.totalCredit, prevTmtData.totalCredit);
    const profitUsdStats = this.calcPercentage(currentUsdData.totalProfit, prevUsdData.totalProfit);
    const profitTmtStats = this.calcPercentage(currentTmtData.totalProfit, prevTmtData.totalProfit);

    return {
      sales_count: {
        value: currentUsdData.count,
        ...salesCountStats,
      },
      sale_price: {
        usd: { value: currentUsdData.totalSale, ...salePriceUsdStats },
        tmt: { value: currentTmtData.totalSale, ...salePriceTmtStats },
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

    const results = await this.totalCalculationModel.findAll({
      where: baseWhere,
      attributes: [
        [formattedDateLiteral, 'period'],
        [fn('COUNT', col('guid')), 'sales_count'],
        [fn('SUM', saleColExpression), 'sale_price'],
        [fn('SUM', creditColExpression), 'credit_price'],
        [fn('SUM', col('profit')), 'profit'],
      ],
      group: [formattedDateLiteral as any],
      order: [[formattedDateLiteral as any, 'ASC']],
      raw: true,
    });

    // Veritabanından gelenleri hızlı eşleşme için Map'e taşıyalım
    const dataMap = new Map<string, any>();
    results.forEach((row: any) => {
      dataMap.set(row.period, {
        sales_count: Number(row.sales_count || 0),
        sale_price: Number(row.sale_price || 0),
        credit_price: Number(row.credit_price || 0),
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

        if (dataMap.has(periodStr)) {
          filledResults.push({ period: periodStr, ...dataMap.get(periodStr) });
        } else {
          filledResults.push({
            period: periodStr,
            sales_count: 0,
            sale_price: 0,
            credit_price: 0,
            profit: 0,
            currency: currency,
          });
        }
        iterDate.setDate(iterDate.getDate() + 1);
      }
    } else if (groupType === 'month') {
      iterDate = new Date(currentStart.getFullYear(), 0, 1);
      const endYear = currentEnd.getFullYear();
      while (iterDate.getFullYear() <= endYear && iterDate <= currentEnd) {
        const year = iterDate.getFullYear();
        const month = String(iterDate.getMonth() + 1).padStart(2, '0');
        const periodStr = `${year}-${month}`;

        if (dataMap.has(periodStr)) {
          filledResults.push({ period: periodStr, ...dataMap.get(periodStr) });
        } else {
          filledResults.push({
            period: periodStr,
            sales_count: 0,
            sale_price: 0,
            credit_price: 0,
            profit: 0,
            currency: currency,
          });
        }
        iterDate.setMonth(iterDate.getMonth() + 1);
      }
    } else {
      results.forEach((row: any) => {
        filledResults.push({
          period: row.period,
          sales_count: Number(row.sales_count || 0),
          sale_price: Number(row.sale_price || 0),
          credit_price: Number(row.credit_price || 0),
          profit: Number(row.profit || 0),
          currency: currency,
        });
      });
    }

    return filledResults;
  }



  async getDashboardStatusSummary(filters: GetSummaryFilterDto & { currency?: 'USD' | 'TMT' }) {
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
      currency: currency,
    };

    if (office_guid) {
      baseWhere.office_guid = office_guid;
    }

    const saleColExpression = currency === 'USD'
      ? literal('COALESCE(sale_price, 0) + COALESCE(sale_price_usd, 0)')
      : col('sale_price');

    const creditColExpression = currency === 'USD'
      ? literal('COALESCE(credit_price, 0) + COALESCE(credit_usd, 0)')
      : col('credit_price');

    const results = await this.totalCalculationModel.findAll({
      where: baseWhere,
      attributes: [
        'status',
        [fn('COUNT', col('guid')), 'count'],
        [fn('SUM', saleColExpression), 'total_sale'],
        [fn('SUM', creditColExpression), 'total_credit'],
      ],
      group: ['status'],
      raw: true,
    });

    const statusMap: Record<string, { count: number; total_sale: number; total_credit: number }> = {
      paid: { count: 0, total_sale: 0, total_credit: 0 },
      notpaid: { count: 0, total_sale: 0, total_credit: 0 },
      REFUND: { count: 0, total_sale: 0, total_credit: 0 },
      null: { count: 0, total_sale: 0, total_credit: 0 },
    };

    let overallTotalCredit = 0;
    let overallTotalCount = 0;

    results.forEach((row: any) => {
      const rawStatus = row.status;
      const key = rawStatus === null || rawStatus === undefined || rawStatus === '' ? 'null' : rawStatus;

      const count = Number(row.count || 0);
      const totalSale = Number(row.total_sale || 0);
      const totalCredit = Number(row.total_credit || 0);

      if (statusMap[key]) {
        statusMap[key].count = count;
        statusMap[key].total_sale = totalSale;
        statusMap[key].total_credit = totalCredit;
      } else {
        statusMap['null'].count += count;
        statusMap['null'].total_sale += totalSale;
        statusMap['null'].total_credit += totalCredit;
      }

      overallTotalCredit += totalCredit;
      overallTotalCount += count;
    });

    const formatStatusItem = (item: { count: number; total_sale: number; total_credit: number }) => {
      const percentage = overallTotalCount > 0 ? Math.round((item.count / overallTotalCount) * 100) : 0;
      return {
        count: item.count,
        total_sale: item.total_sale,
        percentage: percentage,
      };
    };

    return {
      currency: currency,
      overall_total_credit: overallTotalCredit,
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
      currency: currency,
    };

    if (office_guid) {
      baseWhere.office_guid = office_guid;
    }

    const saleColExpression = currency === 'USD'
      ? literal('COALESCE(sale_price, 0) + COALESCE(sale_price_usd, 0)')
      : col('sale_price');

    const profitCol = 'profit';

    const results = await this.totalCalculationModel.findAll({
      where: baseWhere,
      attributes: [
        'receiver_opr_guid',
        [fn('COUNT', col('TotalCalculation.guid')), 'sales_count'],
        [fn('SUM', saleColExpression), 'total_sale'],
        [fn('SUM', col(profitCol)), 'total_profit'],
      ],
      include: [
        {
          model: Employee,
          as: 'receiver_operator',
          attributes: ['fullName'],
        },
      ],
      group: ['receiver_opr_guid', 'receiver_operator.guid', 'receiver_operator.fullName'],
      order: [[fn('COUNT', col('TotalCalculation.guid')), 'DESC']],
      raw: true,
    });

    let overallTotalCount = 0;
    results.forEach((row: any) => {
      overallTotalCount += Number(row.sales_count || 0);
    });

    return results.map((row: any) => {
      const salesCount = Number(row.sales_count || 0);
      const percentage = overallTotalCount > 0 ? Math.round((salesCount / overallTotalCount) * 100) : 0;

      return {
        operator_guid: row.receiver_opr_guid,
        operator_name: row['receiver_operator.fullName'] || 'Bilinmeyen Operatör',
        sales_count: salesCount,
        percentage: percentage,
        sale_price: Number(row.total_sale || 0),
        profit: Number(row.total_profit || 0),
      };
    });
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



  private async calculateMetrics(whereCondition: any, currencyType: 'USD' | 'TMT') {
    const queryWhere = {
      ...whereCondition,
      currency: currencyType,
    };

    let saleColExpression = currencyType === 'USD'
      ? literal('COALESCE(sale_price, 0) + COALESCE(sale_price_usd, 0)')
      : col('sale_price');

    let creditColExpression = currencyType === 'USD'
      ? literal('COALESCE(credit_price, 0) + COALESCE(credit_usd, 0)')
      : col('credit_price');

    const result = await this.totalCalculationModel.findOne({
      where: queryWhere,
      attributes: [
        [fn('COUNT', col('guid')), 'count'],
        [fn('SUM', saleColExpression), 'totalSale'],
        [fn('SUM', creditColExpression), 'totalCredit'],
        [fn('SUM', col('profit')), 'totalProfit'],
      ],
      raw: true,
    });

    return {
      count: Number(result?.['count'] || 0),
      totalSale: Number(result?.['totalSale'] || 0),
      totalCredit: Number(result?.['totalCredit'] || 0),
      totalProfit: Number(result?.['totalProfit'] || 0),
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
}