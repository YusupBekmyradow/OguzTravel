import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { TotalCalculation } from './entities/total_calculation.entity';
import { CreateTotalCalculationDto } from './dto/create-total_calculation.dto';
import { UpdateTotalCalculationDto } from './dto/update-total_calculation.dto';
import { ImportTotalCalculationRowDto } from './dto/import-total_calculations.dto';
import { Employee } from '../employee/entities/employee.entity';
import { Office } from '../office/entities/office.entity';
import { Category } from '../category/entities/category.entity';
import { I18nService } from 'nestjs-i18n';
import { errorResponse, successResponse } from '../../helpers/responseFunctions';
import { HttpStatuses } from '../../helpers/httpStatuses.enum';
import { Sequelize } from 'sequelize-typescript';
import { QueryTypes, Op } from 'sequelize';

export const SYSTEM_CATEGORIES = {
  B2B: 'e1000000-0000-0000-0000-000000000001',
  AIRWAY: 'e1000000-0000-0000-0000-000000000002',
  RAILWAY: 'e1000000-0000-0000-0000-000000000003',
  HOTEL: 'e1000000-0000-0000-0000-000000000004',
  TOUR: 'e1000000-0000-0000-0000-000000000005',
  TRANSFER: 'e1000000-0000-0000-0000-000000000006',
  PACKAGE: 'e1000000-0000-0000-0000-000000000007',
  VISA: 'e1000000-0000-0000-0000-000000000008',
  TRANSLATION: 'e1000000-0000-0000-0000-000000000009',
  REFERRAL_LETTER: 'e1000000-0000-0000-0000-000000000010',
  CAFETERIA: 'e1000000-0000-0000-0000-000000000011',
  SALARY: 'e1000000-0000-0000-0000-000000000012',
};

@Injectable()
export class TotalCalculationsService implements OnModuleInit {
  constructor(
    @InjectModel(TotalCalculation)
    private totalCalculationModel: typeof TotalCalculation,
    @InjectModel(Employee)
    private employeeRepo: typeof Employee,
    @InjectModel(Category)
    private categoryRepo: typeof Category,
    private sequelize: Sequelize,
    private readonly i18n: I18nService,
  ) { }

  async onModuleInit() {
    await this.ensureDefaultCategories();
    await this.initTriggers();
  }

  private async ensureDefaultCategories() {
    try {
      const defaults = [
        { guid: SYSTEM_CATEGORIES.B2B, name: { tk: 'B2B', ru: 'B2B', en: 'B2B' } },
        { guid: SYSTEM_CATEGORIES.AIRWAY, name: { tk: 'Howa ýollary', ru: 'Авиалинии', en: 'Airways' } },
        { guid: SYSTEM_CATEGORIES.RAILWAY, name: { tk: 'Demir ýollary', ru: 'Железная дорога', en: 'Railway' } },
        { guid: SYSTEM_CATEGORIES.HOTEL, name: { tk: 'Myhmanhana', ru: 'Отель', en: 'Hotel' } },
        { guid: SYSTEM_CATEGORIES.TOUR, name: { tk: 'Syýahat', ru: 'Тур', en: 'Tour' } },
        { guid: SYSTEM_CATEGORIES.TRANSFER, name: { tk: 'Ulag', ru: 'Трансфер', en: 'Transfer' } },
        { guid: SYSTEM_CATEGORIES.PACKAGE, name: { tk: 'Bukja', ru: 'Пакет', en: 'Package' } },
        { guid: SYSTEM_CATEGORIES.VISA, name: { tk: 'Wiza', ru: 'Виза', en: 'Visa' } },
        { guid: SYSTEM_CATEGORIES.TRANSLATION, name: { tk: 'Terjime', ru: 'Перевод', en: 'Translation' } },
        { guid: SYSTEM_CATEGORIES.REFERRAL_LETTER, name: { tk: 'Ugur haty', ru: 'Направление', en: 'Referral Letter' } },
        { guid: SYSTEM_CATEGORIES.CAFETERIA, name: { tk: 'Kafe', ru: 'Кафе', en: 'Cafeteria' } },
        { guid: SYSTEM_CATEGORIES.SALARY, name: { tk: 'Işgärler', ru: 'Сотрудники', en: 'Employees' } },
      ];

      for (const item of defaults) {
        const existing = await this.categoryRepo.findByPk(item.guid);
        if (!existing) {
          await this.categoryRepo.create(item as any);
        }
      }
    } catch (err) {
      console.error('Error ensuring default categories:', err);
    }
  }

  private getTotalCalculationIncludes() {
    return [
      {
        model: Employee,
        as: 'receiver_operator',
        attributes: ['guid', 'fullName']
      },
      {
        model: Office,
        as: 'office',
        attributes: ['guid', 'fullName', 'shortName']
      },
      {
        model: Category,
        as: 'category',
        attributes: ['guid', 'name', 'index_number']
      }
    ];
  }


  async addTotalCalculation(createDto: CreateTotalCalculationDto, lang: string = 'tk') {
    try {
      let officeGuid: string | null = createDto.office_guid || null;

      if (!officeGuid && createDto.receiver_opr_guid) {
        const employee = await this.employeeRepo.findOne({
          where: { guid: createDto.receiver_opr_guid }
        });
        if (employee && employee.office_guid) {
          officeGuid = employee.office_guid;
        }
      }
      const type = createDto.type || 'EXPENSE';
      const amount = Number(createDto.amount ?? createDto.net_price) || 0;
      const profit = type === 'INCOME' && createDto.profit != null ? Number(createDto.profit) : null;
      if (this.isInvalidProfit(amount, profit)) {
        return errorResponse(
          HttpStatuses.BAD_REQUEST,
          this.i18n.t('total_calculation.invalidProfit', { lang })
        );
      }

      const record = await this.totalCalculationModel.create({
        category_guid: createDto.category_guid || null,
        datetime: createDto.datetime ? new Date(createDto.datetime) : new Date(),
        receiver_opr_guid: createDto.receiver_opr_guid || null,
        office_guid: officeGuid,
        ...this.splitAmount(type, amount, profit),
        currency: createDto.currency || 'USD',
        credit_price: 0,
        status: null,
        is_manual: true,
        type,
        source: 'MANUAL',
        description: createDto.description?.trim() || null,
        giver: createDto.giver?.trim() || null,
        receiver: createDto.receiver?.trim() || null,
        company: createDto.company?.trim() || null,
      } as any);

      const created = await this.totalCalculationModel.findByPk(record.guid, {
        include: this.getTotalCalculationIncludes()
      });

      return successResponse(
        HttpStatuses.CREATED,
        created,
        this.i18n.t('total_calculation.created', { lang })
      );
    } catch (error: any) {
      return errorResponse(
        HttpStatuses.INTERNAL_SERVER_ERROR,
        this.i18n.t('total_calculation.createFailed', { lang }),
        error
      );
    }
  }



  async updateTotalCalculation(updateDto: UpdateTotalCalculationDto, lang: string = 'tk') {
    try {
      const existing = await this.totalCalculationModel.findByPk(updateDto.guid);
      if (!existing) {
        return errorResponse(
          HttpStatuses.NOT_FOUND,
          this.i18n.t('total_calculation.notFound', { lang })
        );
      }
      if (!existing.is_manual) {
        return errorResponse(
          HttpStatuses.FORBIDDEN,
          this.i18n.t('total_calculation.cannotUpdateTrigger', { lang })
        );
      }
      const updateData: any = {};

      if (updateDto.category_guid !== undefined) {
        updateData.category_guid = updateDto.category_guid || null;
      }

      if (updateDto.datetime !== undefined) {
        updateData.datetime = new Date(updateDto.datetime);
      }
      const nextAmount = updateDto.amount ?? updateDto.net_price;
      if (updateDto.type !== undefined || nextAmount !== undefined || updateDto.profit !== undefined) {
        const prevType = existing.type || 'EXPENSE';
        const type = updateDto.type || prevType;
        const amount = nextAmount !== undefined
          ? Number(nextAmount)
          : Number(prevType === 'INCOME' ? existing.sale_price : existing.net_price);
        const hadProfit = prevType === 'INCOME' && (Number(existing.profit) > 0 || Number(existing.net_price) > 0);
        const profit = type !== 'INCOME'
          ? null
          : updateDto.profit != null
            ? Number(updateDto.profit)
            : hadProfit ? Number(existing.profit) : null;
        if (this.isInvalidProfit(amount, profit)) {
          return errorResponse(
            HttpStatuses.BAD_REQUEST,
            this.i18n.t('total_calculation.invalidProfit', { lang })
          );
        }
        updateData.type = type;
        Object.assign(updateData, this.splitAmount(type, amount, profit));
      }
      for (const key of ['description', 'giver', 'receiver', 'company'] as const) {
        if (updateDto[key] !== undefined) {
          updateData[key] = updateDto[key]?.trim() || null;
        }
      }
      if (updateDto.currency !== undefined) {
        updateData.currency = updateDto.currency;
      }
      if (updateDto.receiver_opr_guid !== undefined) {
        updateData.receiver_opr_guid = updateDto.receiver_opr_guid || null;
      }
      if (updateDto.office_guid !== undefined) {
        updateData.office_guid = updateDto.office_guid || null;
      } else if (
        updateDto.receiver_opr_guid !== undefined &&
        (updateDto.receiver_opr_guid || null) !== (existing.receiver_opr_guid || null)
      ) {
        if (updateDto.receiver_opr_guid) {
          const employee = await this.employeeRepo.findOne({
            where: { guid: updateDto.receiver_opr_guid }
          });
          updateData.office_guid = employee?.office_guid || null;
        } else {
          updateData.office_guid = null;
        }
      }
      await existing.update(updateData);
      const updated = await this.totalCalculationModel.findByPk(existing.guid, {
        include: this.getTotalCalculationIncludes()
      });
      return successResponse(
        HttpStatuses.OK,
        updated,
        this.i18n.t('total_calculation.updated', { lang })
      );
    } catch (error: any) {
      return errorResponse(
        HttpStatuses.INTERNAL_SERVER_ERROR,
        this.i18n.t('total_calculation.updateFailed', { lang }),
        error
      );
    }
  }



  async deleteTotalCalculation(guid: string, lang: string = 'tk') {
    try {
      const existing = await this.totalCalculationModel.findByPk(guid);
      if (!existing) {
        return errorResponse(
          HttpStatuses.NOT_FOUND,
          this.i18n.t('total_calculation.notFound', { lang })
        );
      }
      if (!existing.is_manual) {
        return errorResponse(
          HttpStatuses.FORBIDDEN,
          this.i18n.t('total_calculation.cannotDeleteTrigger', { lang })
        );
      }
      await existing.destroy();
      return successResponse(
        HttpStatuses.OK,
        null,
        this.i18n.t('total_calculation.deleted', { lang })
      );
    } catch (error: any) {
      return errorResponse(
        HttpStatuses.INTERNAL_SERVER_ERROR,
        this.i18n.t('total_calculation.deleteFailed', { lang }),
        error
      );
    }
  }



  private splitAmount(type: string, amount: number, profit: number | null = null) {
    if (type !== 'INCOME') return { sale_price: 0, net_price: amount, profit: 0 };
    if (profit == null) return { sale_price: amount, net_price: 0, profit: 0 };
    return { sale_price: amount, net_price: amount - profit, profit };
  }

  private isInvalidProfit(amount: number, profit: number | null) {
    return profit != null && (isNaN(profit) || profit < 0 || profit > amount);
  }


  async importTotalCalculations(rows: ImportTotalCalculationRowDto[], lang: string = 'tk') {
    const transaction = await this.sequelize.transaction();
    try {
      const keys = [...new Set(rows.map(r => r.import_key))];
      const existing = await this.totalCalculationModel.findAll({
        where: { import_key: { [Op.in]: keys } },
        attributes: ['import_key'],
        transaction,
      });
      const seen = new Set(existing.map(e => e.import_key));
      const fresh = rows.filter(r => {
        if (seen.has(r.import_key)) return false;
        seen.add(r.import_key);
        return true;
      });
      const categories = await this.categoryRepo.findAll({ attributes: ['guid', 'name'], transaction });
      const categoryByName = new Map<string, string>();
      for (const cat of categories) {
        for (const n of Object.values(cat.name || {})) {
          const k = String(n || '').trim().toLowerCase();
          if (k && !categoryByName.has(k)) categoryByName.set(k, cat.guid);
        }
      }
      let categoriesCreated = 0;
      for (const row of fresh) {
        const name = row.category_name?.trim();
        if (!name || categoryByName.has(name.toLowerCase())) continue;
        const created = await this.categoryRepo.create(
          { name: { tk: name, ru: name, en: name } } as any,
          { transaction },
        );
        categoryByName.set(name.toLowerCase(), created.guid);
        categoriesCreated++;
      }

      if (fresh.length) {
        await this.totalCalculationModel.bulkCreate(
          fresh.map(r => ({
            category_guid: r.category_name ? categoryByName.get(r.category_name.trim().toLowerCase()) || null : null,
            datetime: new Date(r.datetime),
            ...this.splitAmount(r.type, Number(r.amount)),
            currency: r.currency.trim().toUpperCase(),
            profit: 0,
            credit_price: 0,
            status: null,
            is_manual: true,
            type: r.type,
            source: 'EXCEL',
            description: r.description?.trim() || null,
            giver: r.giver?.trim() || null,
            receiver: r.receiver?.trim() || null,
            company: r.company?.trim() || null,
            import_key: r.import_key,
          })) as any[],
          { transaction, ignoreDuplicates: true },
        );
      }

      await transaction.commit();
      return successResponse(
        HttpStatuses.CREATED,
        { inserted: fresh.length, skipped: rows.length - fresh.length, categoriesCreated },
        this.i18n.t('total_calculation.imported', { lang })
      );
    } catch (error: any) {
      await transaction.rollback();
      return errorResponse(
        HttpStatuses.INTERNAL_SERVER_ERROR,
        this.i18n.t('total_calculation.importFailed', { lang }),
        error
      );
    }
  }


  async getAllTotalCalculations(
    page: number = 1,
    limit: number = 10,
    filters?: {
      search?: string;
      category_guid?: string;
      datetime?: string;
      receiver_opr_guid?: string;
      office_guid?: string;
      has_office?: boolean;
      status?: string;
      currency?: string;
      is_manual?: boolean;
      source?: string;
      type?: string;
      date_from?: string;
      date_to?: string;
    },
    lang: string = 'tk',
  ) {
    try {
      const currentPage = Math.max(1, Number(page));
      const currentLimit = Math.max(1, Number(limit));
      const offset = (currentPage - 1) * currentLimit;

      const conditions: string[] = [];
      const replacements: Record<string, any> = { limit: currentLimit, offset };

      if (filters?.search?.trim()) {
        conditions.push(`(
          cat.name::text ILIKE :search OR
          tc.status ILIKE :search OR
          tc.currency ILIKE :search OR
          tc.description ILIKE :search OR
          tc.giver ILIKE :search OR
          tc.receiver ILIKE :search OR
          tc.company ILIKE :search OR
          emp."fullName" ILIKE :search
        )`);
        replacements.search = `%${filters.search.trim()}%`;
      }
      if (filters?.category_guid) {
        conditions.push(`tc.category_guid = :category_guid`);
        replacements.category_guid = filters.category_guid;
      }
      if (filters?.datetime) {
        const d = new Date(filters.datetime);
        if (!isNaN(d.getTime())) {
          if (filters.datetime.length <= 4) {
            conditions.push(`tc.datetime BETWEEN :dateFrom AND :dateTo`);
            replacements.dateFrom = `${d.getFullYear()}-01-01 00:00:00`;
            replacements.dateTo = `${d.getFullYear()}-12-31 23:59:59`;
          } else {
            const day = filters.datetime.substring(0, 10);
            conditions.push(`tc.datetime BETWEEN :dateFrom AND :dateTo`);
            replacements.dateFrom = `${day} 00:00:00`;
            replacements.dateTo = `${day} 23:59:59`;
          }
        }
      }
      if (filters?.receiver_opr_guid) {
        conditions.push(`tc.receiver_opr_guid = :receiver_opr_guid`);
        replacements.receiver_opr_guid = filters.receiver_opr_guid;
      }
      if (filters?.office_guid) {
        conditions.push(`tc.office_guid = :office_guid`);
        replacements.office_guid = filters.office_guid;
      }
      if (filters?.has_office) {
        conditions.push(`tc.office_guid IS NOT NULL`);
      }
      if (filters?.status) {
        conditions.push(`tc.status = :status`);
        replacements.status = filters.status;
      }
      if (filters?.currency) {
        conditions.push(`(tc.currency = :currency OR (:currency = 'USD' AND (COALESCE(tc.sale_price_usd, 0) > 0 OR COALESCE(tc.net_price_usd, 0) > 0)))`);
        replacements.currency = filters.currency;
      }
      if (filters?.is_manual !== undefined && filters?.is_manual !== null) {
        conditions.push(`tc.is_manual = :is_manual`);
        replacements.is_manual = filters.is_manual;
      }
      const sources = (filters?.source || '').split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
      if (sources.length) {
        conditions.push(`COALESCE(tc.source, 'PROJECT') IN (:sources)`);
        replacements.sources = sources;
      }
      if (filters?.type === 'INCOME') {
        conditions.push(`(tc.type = 'INCOME' OR (tc.type IS NULL AND (tc.sale_price > 0 OR COALESCE(tc.sale_price_usd, 0) > 0)))`);
      } else if (filters?.type === 'EXPENSE') {
        conditions.push(`(tc.type = 'EXPENSE' OR (tc.type IS NULL AND (tc.net_price > 0 OR COALESCE(tc.net_price_usd, 0) > 0)))`);
      }
      // Compared as local (Ashgabat) calendar days, both included: with UTC day bounds a row
      // entered between 00:00 and 05:00 local time landed on the day before.
      if (filters?.date_from && /^\d{4}-\d{2}-\d{2}/.test(filters.date_from)) {
        conditions.push(`(tc.datetime AT TIME ZONE 'Asia/Ashgabat')::date >= CAST(:rangeFrom AS date)`);
        replacements.rangeFrom = filters.date_from.substring(0, 10);
      }
      if (filters?.date_to && /^\d{4}-\d{2}-\d{2}/.test(filters.date_to)) {
        conditions.push(`(tc.datetime AT TIME ZONE 'Asia/Ashgabat')::date <= CAST(:rangeTo AS date)`);
        replacements.rangeTo = filters.date_to.substring(0, 10);
      }
      const WHERE = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
      const baseQuery = `
        FROM tbl_total_calculations tc
        LEFT JOIN tbl_categories cat ON cat.guid = tc.category_guid
        LEFT JOIN tbl_employees emp ON emp.guid = tc.receiver_opr_guid
        LEFT JOIN tbl_offices ofc ON ofc.guid = tc.office_guid
        ${WHERE}
      `;
      const [data, countResult, totalsResult] = await Promise.all([
        this.sequelize.query<any>(`
          SELECT
            tc.guid, tc.category_guid, tc.datetime,
            tc.receiver_opr_guid, tc.office_guid,
            tc.status, tc.net_price, tc.sale_price,
            tc.currency, tc.profit, tc.credit_price, tc.sale_price_usd, tc.credit_usd,
            tc.net_price_usd, tc.profit_usd,
            tc.is_manual, tc.index_number,
            tc.type, COALESCE(tc.source, 'PROJECT') AS source,
            tc.description, tc.giver, tc.receiver, tc.company,
            tc."createdAt", tc."updatedAt",
            cat.guid            AS "cat_guid",
            cat.name            AS "cat_name",
            cat.index_number    AS "cat_index_number",
            emp.guid            AS "opr_guid",
            emp."fullName"      AS "opr_fullName",
            ofc.guid            AS "off_guid",
            ofc."fullName"      AS "off_fullName",
            ofc."shortName"     AS "off_shortName"
          ${baseQuery}
          ORDER BY tc.datetime DESC, tc.index_number DESC
          LIMIT :limit OFFSET :offset
        `, { replacements, type: QueryTypes.SELECT }),

        this.sequelize.query<any>(`SELECT COUNT(*) AS total ${baseQuery}`,
          { replacements, type: QueryTypes.SELECT }
        ),

        this.sequelize.query<any>(`
          SELECT
            v.currency,
            COALESCE(SUM(v.income), 0)  AS income,
            COALESCE(SUM(v.expense), 0) AS expense,
            COALESCE(SUM(v.profit), 0)  AS profit,
            COUNT(*)                    AS count
          FROM (
            SELECT tc.currency, tc.sale_price, tc.net_price, tc.profit, tc.sale_price_usd,
                   tc.net_price_usd, tc.profit_usd
            ${baseQuery}
          ) f
          CROSS JOIN LATERAL (VALUES
            (f.currency, f.sale_price, f.net_price, f.profit, TRUE),
            ('USD', COALESCE(f.sale_price_usd, 0), COALESCE(f.net_price_usd, 0), COALESCE(f.profit_usd, 0), FALSE)
          ) AS v(currency, income, expense, profit, is_own)
          WHERE (
            (v.is_own AND NOT ((COALESCE(f.sale_price_usd, 0) > 0 OR COALESCE(f.net_price_usd, 0) > 0) AND COALESCE(f.sale_price, 0) = 0 AND COALESCE(f.net_price, 0) = 0))
            OR (NOT v.is_own AND (v.income > 0 OR v.expense > 0))
          )
          ${filters?.currency ? 'AND v.currency = :currency' : ''}
          GROUP BY v.currency
          ORDER BY v.currency
        `, { replacements, type: QueryTypes.SELECT }),
      ]);

      const parseJson = (val: any) => {
        if (!val) return null;
        if (typeof val === 'object') return val;
        try { return JSON.parse(val); } catch { return val; }
      };

      const rows = data.map(r => ({
        guid: r.guid,
        category_guid: r.category_guid,
        category: r['cat_guid']
          ? {
            guid: r['cat_guid'],
            name: parseJson(r['cat_name']),
            index_number: r['cat_index_number'],
          }
          : null,
        datetime: r.datetime,
        receiver_opr_guid: r.receiver_opr_guid,
        office_guid: r.office_guid,
        status: r.status,
        net_price: r.net_price,
        sale_price: r.sale_price,
        currency: r.currency,
        profit: r.profit,
        credit_price: r.credit_price,
        sale_price_usd: r.sale_price_usd,
        credit_usd: r.credit_usd,
        net_price_usd: r.net_price_usd,
        profit_usd: r.profit_usd,
        is_manual: r.is_manual,
        index_number: r.index_number,
        type: r.type,
        source: r.source,
        description: r.description,
        giver: r.giver,
        receiver: r.receiver,
        company: r.company,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        receiver_operator: r['opr_guid']
          ? { guid: r['opr_guid'], fullName: r['opr_fullName'] }
          : null,
        office: r['off_guid']
          ? { guid: r['off_guid'], fullName: parseJson(r['off_fullName']), shortName: parseJson(r['off_shortName']) }
          : null,
      }));
      const totalItems = Number(countResult[0]?.total ?? 0);
      return {
        status: 200,
        data: rows,
        meta: {
          totalItems,
          totalPages: Math.ceil(totalItems / currentLimit),
          currentPage,
          totals: totalsResult.map(t => ({
            currency: t.currency,
            income: Number(t.income),
            expense: Number(t.expense),
            profit: Number(t.profit),
            balance: Number(t.income) - Number(t.expense),
            count: Number(t.count),
          })),
        },
        message: this.i18n.t('total_calculation.listFetched', { lang }),
      };
    } catch (error: any) {
      return errorResponse(
        HttpStatuses.INTERNAL_SERVER_ERROR,
        this.i18n.t('total_calculation.fetchFailed', { lang }),
        error
      );
    }
  }


  // -------------------------------------------------------------
  // Initialize Triggers for Sync
  // -------------------------------------------------------------
  private async initTriggers() {
    const sequelize = this.totalCalculationModel.sequelize;
    if (!sequelize) return;

    try {
      // -------------------------------------------------------------
      // Ensure category_guid column exists and update existing records
      // -------------------------------------------------------------
      await sequelize.query(`
        DO $$ 
        BEGIN 
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'tbl_total_calculations' AND column_name = 'category_guid'
          ) THEN
            ALTER TABLE tbl_total_calculations ADD COLUMN category_guid UUID;
          END IF;
        END $$;
      `);

      // -------------------------------------------------------------
      // Cash-ledger columns (manual + Excel kassa rows)
      // -------------------------------------------------------------
      await sequelize.query(`
        ALTER TABLE tbl_total_calculations
          ADD COLUMN IF NOT EXISTS type VARCHAR(20),
          ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'PROJECT',
          ADD COLUMN IF NOT EXISTS description TEXT,
          ADD COLUMN IF NOT EXISTS giver VARCHAR(255),
          ADD COLUMN IF NOT EXISTS receiver VARCHAR(255),
          ADD COLUMN IF NOT EXISTS company VARCHAR(255),
          ADD COLUMN IF NOT EXISTS import_key VARCHAR(64),
          ADD COLUMN IF NOT EXISTS sale_price_usd DECIMAL(12,2) DEFAULT 0,
          ADD COLUMN IF NOT EXISTS credit_usd DECIMAL(12,2) DEFAULT 0,
          ADD COLUMN IF NOT EXISTS net_price_usd DECIMAL(12,2) DEFAULT 0,
          ADD COLUMN IF NOT EXISTS profit_usd DECIMAL(12,2) DEFAULT 0;
      `);
      // A visa's profit per currency, read by its trigger below.
      await sequelize.query(`
        ALTER TABLE tbl_visa
          ADD COLUMN IF NOT EXISTS profit_tmt DECIMAL(12,2) DEFAULT 0,
          ADD COLUMN IF NOT EXISTS profit_usd DECIMAL(12,2) DEFAULT 0;
      `);
      // Rows created from the UI before these columns existed were expenses.
      await sequelize.query(`
        UPDATE tbl_total_calculations
        SET source = 'MANUAL', type = COALESCE(type, 'EXPENSE')
        WHERE is_manual = TRUE AND (source IS NULL OR source = 'PROJECT');
      `);
      await sequelize.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS uq_total_calculations_import_key
          ON tbl_total_calculations (import_key) WHERE import_key IS NOT NULL;
        CREATE INDEX IF NOT EXISTS idx_total_calculations_datetime
          ON tbl_total_calculations (datetime DESC);
      `);

      // -------------------------------------------------------------
      // 1. B2B & TicketPayment Triggers
      // -------------------------------------------------------------
      await sequelize.query(`
        CREATE OR REPLACE FUNCTION sync_b2b_to_total_calculations()
        RETURNS TRIGGER AS $$
        DECLARE
          v_operator_guid UUID;
          v_office_guid UUID;
          v_credit_price DECIMAL(12, 2);
          v_status VARCHAR(50);
        BEGIN
          IF TG_OP = 'DELETE' THEN
            DELETE FROM tbl_total_calculations WHERE guid = OLD.guid;
            RETURN OLD;
          END IF;

          -- A B2B sale is booked to the assigning operator ("Tabşyryjy") and their office,
          -- not to the receiving one. A ticket saved without one falls back to the receiver.
          v_operator_guid := COALESCE(NEW.assignment_opr_guid, NEW.receiver_opr_guid);

          SELECT office_guid INTO v_office_guid
          FROM tbl_employees
          WHERE guid = v_operator_guid;

          SELECT GREATEST(COALESCE(NEW.sale_price, 0) - COALESCE(SUM(amount), 0), 0) INTO v_credit_price 
          FROM tbl_ticket_payments 
          WHERE b2b_guid = NEW.guid;

          IF NEW.status_guid::text = '22f0d634-5798-4e5b-9d2b-34b94ec36fbf' THEN
            v_status := 'REFUND';
          ELSIF NEW.is_paid IS TRUE THEN
            v_status := 'paid';
          ELSE
            v_status := 'notpaid';
          END IF;

          INSERT INTO tbl_total_calculations (
            guid,
            category_guid,
            datetime,
            receiver_opr_guid,
            office_guid,
            status,
            net_price,
            sale_price,
            currency,
            profit,
            credit_price,
            is_manual,
            "createdAt",
            "updatedAt"
          ) VALUES (
            NEW.guid,
            '${SYSTEM_CATEGORIES.B2B}'::uuid,
            COALESCE(NEW.datetime, NOW()),
            v_operator_guid,
            v_office_guid,
            v_status,
            COALESCE(NEW.net_price, 0),
            COALESCE(NEW.sale_price, 0),
            COALESCE(NEW.currency, 'USD'),
            COALESCE(NEW.profit, 0),
            COALESCE(v_credit_price, 0),
            FALSE,
            NOW(),
            NOW()
          )
          ON CONFLICT (guid) DO UPDATE SET
            category_guid = EXCLUDED.category_guid,
            datetime = EXCLUDED.datetime,
            receiver_opr_guid = EXCLUDED.receiver_opr_guid,
            office_guid = EXCLUDED.office_guid,
            status = EXCLUDED.status,
            net_price = EXCLUDED.net_price,
            sale_price = EXCLUDED.sale_price,
            currency = EXCLUDED.currency,
            profit = EXCLUDED.profit,
            credit_price = EXCLUDED.credit_price,
            is_manual = FALSE,
            "updatedAt" = NOW();

          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `);

      await sequelize.query(`
        DROP TRIGGER IF EXISTS trg_sync_b2b_to_total_calculations ON tbl_b2b;
        CREATE TRIGGER trg_sync_b2b_to_total_calculations
        AFTER INSERT OR UPDATE OR DELETE ON tbl_b2b
        FOR EACH ROW EXECUTE FUNCTION sync_b2b_to_total_calculations();
      `);

      await sequelize.query(`
        CREATE OR REPLACE FUNCTION sync_b2b_payment_to_total_calculations()
        RETURNS TRIGGER AS $$
        DECLARE
          v_target_b2b_guid UUID;
          v_total_unpaid DECIMAL(12, 2);
        BEGIN
          IF TG_OP = 'DELETE' THEN
            v_target_b2b_guid := OLD.b2b_guid;
          ELSE
            v_target_b2b_guid := NEW.b2b_guid;
          END IF;

          IF v_target_b2b_guid IS NOT NULL THEN
            SELECT GREATEST(COALESCE(b.sale_price, 0) - COALESCE(SUM(p.amount), 0), 0) INTO v_total_unpaid
            FROM tbl_b2b b
            LEFT JOIN tbl_ticket_payments p ON p.b2b_guid = b.guid
            WHERE b.guid = v_target_b2b_guid
            GROUP BY b.guid, b.sale_price;

            UPDATE tbl_total_calculations
            SET credit_price = COALESCE(v_total_unpaid, 0),
                "updatedAt" = NOW()
            WHERE guid = v_target_b2b_guid;
          END IF;

          IF TG_OP = 'UPDATE' AND OLD.b2b_guid IS NOT NULL AND OLD.b2b_guid IS DISTINCT FROM NEW.b2b_guid THEN
            SELECT GREATEST(COALESCE(b.sale_price, 0) - COALESCE(SUM(p.amount), 0), 0) INTO v_total_unpaid
            FROM tbl_b2b b
            LEFT JOIN tbl_ticket_payments p ON p.b2b_guid = b.guid
            WHERE b.guid = OLD.b2b_guid
            GROUP BY b.guid, b.sale_price;

            UPDATE tbl_total_calculations
            SET credit_price = COALESCE(v_total_unpaid, 0),
                "updatedAt" = NOW()
            WHERE guid = OLD.b2b_guid;
          END IF;

          IF TG_OP = 'DELETE' THEN
            RETURN OLD;
          ELSE
            RETURN NEW;
          END IF;
        END;
        $$ LANGUAGE plpgsql;
      `);

      await sequelize.query(`
        DROP TRIGGER IF EXISTS trg_sync_ticket_payment_to_total_calculations ON tbl_ticket_payments;
        CREATE TRIGGER trg_sync_ticket_payment_to_total_calculations
        AFTER INSERT OR UPDATE OR DELETE ON tbl_ticket_payments
        FOR EACH ROW EXECUTE FUNCTION sync_b2b_payment_to_total_calculations();
      `);

      // -------------------------------------------------------------
      // 2. Airway Trigger (tbl_airway)
      // -------------------------------------------------------------
      await sequelize.query(`
        CREATE OR REPLACE FUNCTION sync_airway_to_total_calculations()
        RETURNS TRIGGER AS $$
        DECLARE
          v_office_guid UUID;
          v_credit_price DECIMAL(12, 2);
          v_status VARCHAR(50);
        BEGIN
          IF TG_OP = 'DELETE' THEN
            DELETE FROM tbl_total_calculations WHERE guid = OLD.guid;
            RETURN OLD;
          END IF;

          SELECT office_guid INTO v_office_guid 
          FROM tbl_employees 
          WHERE guid = NEW.opr_guid;

          SELECT GREATEST(COALESCE(NEW.price, 0) - COALESCE(SUM(amount), 0), 0) INTO v_credit_price 
          FROM "tbl_HAR_payments" 
          WHERE airway_guid = NEW.guid;

          IF NEW.is_paid = 3 THEN
            v_status := 'REFUND';
          ELSIF NEW.is_paid = 1 THEN
            v_status := 'paid';
          ELSIF NEW.is_paid = 2 THEN
            v_status := 'notpaid';
          ELSE
            v_status := 'notpaid';
          END IF;

          INSERT INTO tbl_total_calculations (
            guid,
            category_guid,
            datetime,
            receiver_opr_guid,
            office_guid,
            status,
            net_price,
            sale_price,
            currency,
            profit,
            credit_price,
            is_manual,
            "createdAt",
            "updatedAt"
          ) VALUES (
            NEW.guid,
            '${SYSTEM_CATEGORIES.AIRWAY}'::uuid,
            COALESCE(NEW.application_date, NOW()),
            NEW.opr_guid,
            v_office_guid,
            v_status,
            COALESCE(NEW.net_fare, 0),
            COALESCE(NEW.price, 0),
            COALESCE(NEW.currency, 'USD'),
            COALESCE(NEW.profit, 0),
            COALESCE(v_credit_price, 0),
            FALSE,
            NOW(),
            NOW()
          )
          ON CONFLICT (guid) DO UPDATE SET
            category_guid = EXCLUDED.category_guid,
            datetime = EXCLUDED.datetime,
            receiver_opr_guid = EXCLUDED.receiver_opr_guid,
            office_guid = EXCLUDED.office_guid,
            status = EXCLUDED.status,
            net_price = EXCLUDED.net_price,
            sale_price = EXCLUDED.sale_price,
            currency = EXCLUDED.currency,
            profit = EXCLUDED.profit,
            credit_price = EXCLUDED.credit_price,
            is_manual = FALSE,
            "updatedAt" = NOW();

          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `);

      await sequelize.query(`
        DROP TRIGGER IF EXISTS trg_sync_airway_to_total_calculations ON tbl_airway;
        CREATE TRIGGER trg_sync_airway_to_total_calculations
        AFTER INSERT OR UPDATE OR DELETE ON tbl_airway
        FOR EACH ROW EXECUTE FUNCTION sync_airway_to_total_calculations();
      `);

      // -------------------------------------------------------------
      // 3. Railway Trigger (tbl_railway)
      // -------------------------------------------------------------
      await sequelize.query(`
        CREATE OR REPLACE FUNCTION sync_railway_to_total_calculations()
        RETURNS TRIGGER AS $$
        DECLARE
          v_office_guid UUID;
          v_credit_price DECIMAL(12, 2);
          v_status VARCHAR(50);
        BEGIN
          IF TG_OP = 'DELETE' THEN
            DELETE FROM tbl_total_calculations WHERE guid = OLD.guid;
            RETURN OLD;
          END IF;

          SELECT office_guid INTO v_office_guid 
          FROM tbl_employees 
          WHERE guid = NEW.opr_guid;

          SELECT GREATEST(COALESCE(NEW.price, 0) - COALESCE(SUM(amount), 0), 0) INTO v_credit_price 
          FROM "tbl_HAR_payments" 
          WHERE railway_guid = NEW.guid;

          IF NEW.is_paid = 3 THEN
            v_status := 'REFUND';
          ELSIF NEW.is_paid = 1 THEN
            v_status := 'paid';
          ELSIF NEW.is_paid = 2 THEN
            v_status := 'notpaid';
          ELSE
            v_status := 'notpaid';
          END IF;

          INSERT INTO tbl_total_calculations (
            guid,
            category_guid,
            datetime,
            receiver_opr_guid,
            office_guid,
            status,
            net_price,
            sale_price,
            currency,
            profit,
            credit_price,
            is_manual,
            "createdAt",
            "updatedAt"
          ) VALUES (
            NEW.guid,
            '${SYSTEM_CATEGORIES.RAILWAY}'::uuid,
            COALESCE(NEW.application_date, NOW()),
            NEW.opr_guid,
            v_office_guid,
            v_status,
            COALESCE(NEW.net_fare, 0),
            COALESCE(NEW.price, 0),
            COALESCE(NEW.currency, 'USD'),
            COALESCE(NEW.profit, 0),
            COALESCE(v_credit_price, 0),
            FALSE,
            NOW(),
            NOW()
          )
          ON CONFLICT (guid) DO UPDATE SET
            category_guid = EXCLUDED.category_guid,
            datetime = EXCLUDED.datetime,
            receiver_opr_guid = EXCLUDED.receiver_opr_guid,
            office_guid = EXCLUDED.office_guid,
            status = EXCLUDED.status,
            net_price = EXCLUDED.net_price,
            sale_price = EXCLUDED.sale_price,
            currency = EXCLUDED.currency,
            profit = EXCLUDED.profit,
            credit_price = EXCLUDED.credit_price,
            is_manual = FALSE,
            "updatedAt" = NOW();

          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `);

      await sequelize.query(`
        DROP TRIGGER IF EXISTS trg_sync_railway_to_total_calculations ON tbl_railway;
        CREATE TRIGGER trg_sync_railway_to_total_calculations
        AFTER INSERT OR UPDATE OR DELETE ON tbl_railway
        FOR EACH ROW EXECUTE FUNCTION sync_railway_to_total_calculations();
      `);

      // -------------------------------------------------------------
      // 4. Hotel Trigger (tbl_hotel)
      // -------------------------------------------------------------
      await sequelize.query(`
        CREATE OR REPLACE FUNCTION sync_hotel_to_total_calculations()
        RETURNS TRIGGER AS $$
        DECLARE
          v_office_guid UUID;
          v_credit_price DECIMAL(12, 2);
          v_status VARCHAR(50);
        BEGIN
          IF TG_OP = 'DELETE' THEN
            DELETE FROM tbl_total_calculations WHERE guid = OLD.guid;
            RETURN OLD;
          END IF;

          SELECT office_guid INTO v_office_guid 
          FROM tbl_employees 
          WHERE guid = NEW.opr_guid;

          SELECT GREATEST(COALESCE(NEW.price, 0) - COALESCE(SUM(amount), 0), 0) INTO v_credit_price 
          FROM "tbl_HAR_payments" 
          WHERE hotel_guid = NEW.guid;

          IF NEW.is_paid = 3 THEN
            v_status := 'REFUND';
          ELSIF NEW.is_paid = 1 THEN
            v_status := 'paid';
          ELSIF NEW.is_paid = 2 THEN
            v_status := 'notpaid';
          ELSE
            v_status := 'notpaid';
          END IF;

          INSERT INTO tbl_total_calculations (
            guid,
            category_guid,
            datetime,
            receiver_opr_guid,
            office_guid,
            status,
            net_price,
            sale_price,
            currency,
            profit,
            credit_price,
            is_manual,
            "createdAt",
            "updatedAt"
          ) VALUES (
            NEW.guid,
            '${SYSTEM_CATEGORIES.HOTEL}'::uuid,
            COALESCE(NEW.application_date, NOW()),
            NEW.opr_guid,
            v_office_guid,
            v_status,
            COALESCE(NEW.net_fare, 0),
            COALESCE(NEW.price, 0),
            COALESCE(NEW.currency, 'USD'),
            COALESCE(NEW.profit, 0),
            COALESCE(v_credit_price, 0),
            FALSE,
            NOW(),
            NOW()
          )
          ON CONFLICT (guid) DO UPDATE SET
            category_guid = EXCLUDED.category_guid,
            datetime = EXCLUDED.datetime,
            receiver_opr_guid = EXCLUDED.receiver_opr_guid,
            office_guid = EXCLUDED.office_guid,
            status = EXCLUDED.status,
            net_price = EXCLUDED.net_price,
            sale_price = EXCLUDED.sale_price,
            currency = EXCLUDED.currency,
            profit = EXCLUDED.profit,
            credit_price = EXCLUDED.credit_price,
            is_manual = FALSE,
            "updatedAt" = NOW();

          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `);

      await sequelize.query(`
        DROP TRIGGER IF EXISTS trg_sync_hotel_to_total_calculations ON tbl_hotel;
        CREATE TRIGGER trg_sync_hotel_to_total_calculations
        AFTER INSERT OR UPDATE OR DELETE ON tbl_hotel
        FOR EACH ROW EXECUTE FUNCTION sync_hotel_to_total_calculations();
      `);

      // -------------------------------------------------------------
      // 5. Tour Trigger (tbl_tour)
      // -------------------------------------------------------------
      await sequelize.query(`
        CREATE OR REPLACE FUNCTION sync_tour_to_total_calculations()
        RETURNS TRIGGER AS $$
        DECLARE
          v_office_guid UUID;
          v_credit_price DECIMAL(12, 2);
          v_status VARCHAR(50);
        BEGIN
          IF TG_OP = 'DELETE' THEN
            DELETE FROM tbl_total_calculations WHERE guid = OLD.guid;
            RETURN OLD;
          END IF;

          SELECT office_guid INTO v_office_guid 
          FROM tbl_employees 
          WHERE guid = NEW.opr_guid;

          SELECT GREATEST(COALESCE(NEW.price, 0) - COALESCE(SUM(amount), 0), 0) INTO v_credit_price 
          FROM "tbl_TTP_payments" 
          WHERE tour_guid = NEW.guid;

          IF NEW.is_paid = 3 THEN
            v_status := 'REFUND';
          ELSIF NEW.is_paid = 1 THEN
            v_status := 'paid';
          ELSIF NEW.is_paid = 2 THEN
            v_status := 'notpaid';
          ELSE
            v_status := 'notpaid';
          END IF;

          INSERT INTO tbl_total_calculations (
            guid,
            category_guid,
            datetime,
            receiver_opr_guid,
            office_guid,
            status,
            net_price,
            sale_price,
            currency,
            profit,
            credit_price,
            is_manual,
            "createdAt",
            "updatedAt"
          ) VALUES (
            NEW.guid,
            '${SYSTEM_CATEGORIES.TOUR}'::uuid,
            COALESCE(NEW.application_date, NOW()),
            NEW.opr_guid,
            v_office_guid,
            v_status,
            COALESCE(NEW.net_fare, 0),
            COALESCE(NEW.price, 0),
            COALESCE(NEW.currency, 'USD'),
            COALESCE(NEW.profit, 0),
            COALESCE(v_credit_price, 0),
            FALSE,
            NOW(),
            NOW()
          )
          ON CONFLICT (guid) DO UPDATE SET
            category_guid = EXCLUDED.category_guid,
            datetime = EXCLUDED.datetime,
            receiver_opr_guid = EXCLUDED.receiver_opr_guid,
            office_guid = EXCLUDED.office_guid,
            status = EXCLUDED.status,
            net_price = EXCLUDED.net_price,
            sale_price = EXCLUDED.sale_price,
            currency = EXCLUDED.currency,
            profit = EXCLUDED.profit,
            credit_price = EXCLUDED.credit_price,
            is_manual = FALSE,
            "updatedAt" = NOW();

          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `);

      await sequelize.query(`
        DROP TRIGGER IF EXISTS trg_sync_tour_to_total_calculations ON tbl_tour;
        CREATE TRIGGER trg_sync_tour_to_total_calculations
        AFTER INSERT OR UPDATE OR DELETE ON tbl_tour
        FOR EACH ROW EXECUTE FUNCTION sync_tour_to_total_calculations();
      `);

      // -------------------------------------------------------------
      // 6. Transfer Trigger (tbl_transfer)
      // -------------------------------------------------------------
      await sequelize.query(`
        CREATE OR REPLACE FUNCTION sync_transfer_to_total_calculations()
        RETURNS TRIGGER AS $$
        DECLARE
          v_office_guid UUID;
          v_credit_price DECIMAL(12, 2);
          v_status VARCHAR(50);
        BEGIN
          IF TG_OP = 'DELETE' THEN
            DELETE FROM tbl_total_calculations WHERE guid = OLD.guid;
            RETURN OLD;
          END IF;

          SELECT office_guid INTO v_office_guid 
          FROM tbl_employees 
          WHERE guid = NEW.opr_guid;

          SELECT GREATEST(COALESCE(NEW.price, 0) - COALESCE(SUM(amount), 0), 0) INTO v_credit_price 
          FROM "tbl_TTP_payments" 
          WHERE transfer_guid = NEW.guid;

          IF NEW.is_paid = 3 THEN
            v_status := 'REFUND';
          ELSIF NEW.is_paid = 1 THEN
            v_status := 'paid';
          ELSIF NEW.is_paid = 2 THEN
            v_status := 'notpaid';
          ELSE
            v_status := 'notpaid';
          END IF;

          INSERT INTO tbl_total_calculations (
            guid,
            category_guid,
            datetime,
            receiver_opr_guid,
            office_guid,
            status,
            net_price,
            sale_price,
            currency,
            profit,
            credit_price,
            is_manual,
            "createdAt",
            "updatedAt"
          ) VALUES (
            NEW.guid,
            '${SYSTEM_CATEGORIES.TRANSFER}'::uuid,
            COALESCE(NEW.application_date, NOW()),
            NEW.opr_guid,
            v_office_guid,
            v_status,
            COALESCE(NEW.net_fare, 0),
            COALESCE(NEW.price, 0),
            COALESCE(NEW.currency, 'USD'),
            COALESCE(NEW.profit, 0),
            COALESCE(v_credit_price, 0),
            FALSE,
            NOW(),
            NOW()
          )
          ON CONFLICT (guid) DO UPDATE SET
            category_guid = EXCLUDED.category_guid,
            datetime = EXCLUDED.datetime,
            receiver_opr_guid = EXCLUDED.receiver_opr_guid,
            office_guid = EXCLUDED.office_guid,
            status = EXCLUDED.status,
            net_price = EXCLUDED.net_price,
            sale_price = EXCLUDED.sale_price,
            currency = EXCLUDED.currency,
            profit = EXCLUDED.profit,
            credit_price = EXCLUDED.credit_price,
            is_manual = FALSE,
            "updatedAt" = NOW();

          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `);

      await sequelize.query(`
        DROP TRIGGER IF EXISTS trg_sync_transfer_to_total_calculations ON tbl_transfer;
        CREATE TRIGGER trg_sync_transfer_to_total_calculations
        AFTER INSERT OR UPDATE OR DELETE ON tbl_transfer
        FOR EACH ROW EXECUTE FUNCTION sync_transfer_to_total_calculations();
      `);

      // -------------------------------------------------------------
      // 7. Package Trigger (tbl_package)
      // -------------------------------------------------------------
      await sequelize.query(`
        CREATE OR REPLACE FUNCTION sync_package_to_total_calculations()
        RETURNS TRIGGER AS $$
        DECLARE
          v_office_guid UUID;
          v_credit_price DECIMAL(12, 2);
          v_status VARCHAR(50);
        BEGIN
          IF TG_OP = 'DELETE' THEN
            DELETE FROM tbl_total_calculations WHERE guid = OLD.guid;
            RETURN OLD;
          END IF;

          SELECT office_guid INTO v_office_guid 
          FROM tbl_employees 
          WHERE guid = NEW.opr_guid;

          SELECT GREATEST(COALESCE(NEW.price, 0) - COALESCE(SUM(amount), 0), 0) INTO v_credit_price 
          FROM "tbl_TTP_payments" 
          WHERE package_guid = NEW.guid;

          IF NEW.is_paid = 3 THEN
            v_status := 'REFUND';
          ELSIF NEW.is_paid = 1 THEN
            v_status := 'paid';
          ELSIF NEW.is_paid = 2 THEN
            v_status := 'notpaid';
          ELSE
            v_status := 'notpaid';
          END IF;

          INSERT INTO tbl_total_calculations (
            guid,
            category_guid,
            datetime,
            receiver_opr_guid,
            office_guid,
            status,
            net_price,
            sale_price,
            currency,
            profit,
            credit_price,
            is_manual,
            "createdAt",
            "updatedAt"
          ) VALUES (
            NEW.guid,
            '${SYSTEM_CATEGORIES.PACKAGE}'::uuid,
            COALESCE(NEW.application_date, NOW()),
            NEW.opr_guid,
            v_office_guid,
            v_status,
            COALESCE(NEW.net_fare, 0),
            COALESCE(NEW.price, 0),
            COALESCE(NEW.currency, 'USD'),
            COALESCE(NEW.profit, 0),
            COALESCE(v_credit_price, 0),
            FALSE,
            NOW(),
            NOW()
          )
          ON CONFLICT (guid) DO UPDATE SET
            category_guid = EXCLUDED.category_guid,
            datetime = EXCLUDED.datetime,
            receiver_opr_guid = EXCLUDED.receiver_opr_guid,
            office_guid = EXCLUDED.office_guid,
            status = EXCLUDED.status,
            net_price = EXCLUDED.net_price,
            sale_price = EXCLUDED.sale_price,
            currency = EXCLUDED.currency,
            profit = EXCLUDED.profit,
            credit_price = EXCLUDED.credit_price,
            is_manual = FALSE,
            "updatedAt" = NOW();

          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `);

      await sequelize.query(`
        DROP TRIGGER IF EXISTS trg_sync_package_to_total_calculations ON tbl_package;
        CREATE TRIGGER trg_sync_package_to_total_calculations
        AFTER INSERT OR UPDATE OR DELETE ON tbl_package
        FOR EACH ROW EXECUTE FUNCTION sync_package_to_total_calculations();
      `);

      // -------------------------------------------------------------
      // 8. HAR Payments Trigger ("tbl_HAR_payments")
      // -------------------------------------------------------------
      await sequelize.query(`
        CREATE OR REPLACE FUNCTION sync_har_payment_to_total_calculations()
        RETURNS TRIGGER AS $$
        DECLARE
          v_total_unpaid DECIMAL(12, 2);
          v_guid UUID;
        BEGIN
          -- Airway
          IF TG_OP = 'DELETE' THEN
            v_guid := OLD.airway_guid;
          ELSE
            v_guid := NEW.airway_guid;
          END IF;
          IF v_guid IS NOT NULL THEN
            SELECT GREATEST(COALESCE(a.price, 0) - COALESCE(SUM(p.amount), 0), 0) INTO v_total_unpaid
            FROM tbl_airway a LEFT JOIN "tbl_HAR_payments" p ON p.airway_guid = a.guid
            WHERE a.guid = v_guid GROUP BY a.guid, a.price;
            UPDATE tbl_total_calculations SET credit_price = COALESCE(v_total_unpaid, 0), "updatedAt" = NOW() WHERE guid = v_guid;
          END IF;
          IF TG_OP = 'UPDATE' AND OLD.airway_guid IS NOT NULL AND OLD.airway_guid IS DISTINCT FROM NEW.airway_guid THEN
            SELECT GREATEST(COALESCE(a.price, 0) - COALESCE(SUM(p.amount), 0), 0) INTO v_total_unpaid
            FROM tbl_airway a LEFT JOIN "tbl_HAR_payments" p ON p.airway_guid = a.guid
            WHERE a.guid = OLD.airway_guid GROUP BY a.guid, a.price;
            UPDATE tbl_total_calculations SET credit_price = COALESCE(v_total_unpaid, 0), "updatedAt" = NOW() WHERE guid = OLD.airway_guid;
          END IF;

          -- Railway
          IF TG_OP = 'DELETE' THEN
            v_guid := OLD.railway_guid;
          ELSE
            v_guid := NEW.railway_guid;
          END IF;
          IF v_guid IS NOT NULL THEN
            SELECT GREATEST(COALESCE(r.price, 0) - COALESCE(SUM(p.amount), 0), 0) INTO v_total_unpaid
            FROM tbl_railway r LEFT JOIN "tbl_HAR_payments" p ON p.railway_guid = r.guid
            WHERE r.guid = v_guid GROUP BY r.guid, r.price;
            UPDATE tbl_total_calculations SET credit_price = COALESCE(v_total_unpaid, 0), "updatedAt" = NOW() WHERE guid = v_guid;
          END IF;
          IF TG_OP = 'UPDATE' AND OLD.railway_guid IS NOT NULL AND OLD.railway_guid IS DISTINCT FROM NEW.railway_guid THEN
            SELECT GREATEST(COALESCE(r.price, 0) - COALESCE(SUM(p.amount), 0), 0) INTO v_total_unpaid
            FROM tbl_railway r LEFT JOIN "tbl_HAR_payments" p ON p.railway_guid = r.guid
            WHERE r.guid = OLD.railway_guid GROUP BY r.guid, r.price;
            UPDATE tbl_total_calculations SET credit_price = COALESCE(v_total_unpaid, 0), "updatedAt" = NOW() WHERE guid = OLD.railway_guid;
          END IF;

          -- Hotel
          IF TG_OP = 'DELETE' THEN
            v_guid := OLD.hotel_guid;
          ELSE
            v_guid := NEW.hotel_guid;
          END IF;
          IF v_guid IS NOT NULL THEN
            SELECT GREATEST(COALESCE(h.price, 0) - COALESCE(SUM(p.amount), 0), 0) INTO v_total_unpaid
            FROM tbl_hotel h LEFT JOIN "tbl_HAR_payments" p ON p.hotel_guid = h.guid
            WHERE h.guid = v_guid GROUP BY h.guid, h.price;
            UPDATE tbl_total_calculations SET credit_price = COALESCE(v_total_unpaid, 0), "updatedAt" = NOW() WHERE guid = v_guid;
          END IF;
          IF TG_OP = 'UPDATE' AND OLD.hotel_guid IS NOT NULL AND OLD.hotel_guid IS DISTINCT FROM NEW.hotel_guid THEN
            SELECT GREATEST(COALESCE(h.price, 0) - COALESCE(SUM(p.amount), 0), 0) INTO v_total_unpaid
            FROM tbl_hotel h LEFT JOIN "tbl_HAR_payments" p ON p.hotel_guid = h.guid
            WHERE h.guid = OLD.hotel_guid GROUP BY h.guid, h.price;
            UPDATE tbl_total_calculations SET credit_price = COALESCE(v_total_unpaid, 0), "updatedAt" = NOW() WHERE guid = OLD.hotel_guid;
          END IF;

          IF TG_OP = 'DELETE' THEN
            RETURN OLD;
          ELSE
            RETURN NEW;
          END IF;
        END;
        $$ LANGUAGE plpgsql;
      `);

      await sequelize.query(`
        DROP TRIGGER IF EXISTS trg_sync_har_payment_to_total_calculations ON "tbl_HAR_payments";
        CREATE TRIGGER trg_sync_har_payment_to_total_calculations
        AFTER INSERT OR UPDATE OR DELETE ON "tbl_HAR_payments"
        FOR EACH ROW EXECUTE FUNCTION sync_har_payment_to_total_calculations();
      `);

      // -------------------------------------------------------------
      // 9. TTP Payments Trigger ("tbl_TTP_payments")
      // -------------------------------------------------------------
      await sequelize.query(`
        CREATE OR REPLACE FUNCTION sync_ttp_payment_to_total_calculations()
        RETURNS TRIGGER AS $$
        DECLARE
          v_total_unpaid DECIMAL(12, 2);
          v_guid UUID;
        BEGIN
          -- Tour
          IF TG_OP = 'DELETE' THEN
            v_guid := OLD.tour_guid;
          ELSE
            v_guid := NEW.tour_guid;
          END IF;
          IF v_guid IS NOT NULL THEN
            SELECT GREATEST(COALESCE(t.price, 0) - COALESCE(SUM(p.amount), 0), 0) INTO v_total_unpaid
            FROM tbl_tour t LEFT JOIN "tbl_TTP_payments" p ON p.tour_guid = t.guid
            WHERE t.guid = v_guid GROUP BY t.guid, t.price;
            UPDATE tbl_total_calculations SET credit_price = COALESCE(v_total_unpaid, 0), "updatedAt" = NOW() WHERE guid = v_guid;
          END IF;
          IF TG_OP = 'UPDATE' AND OLD.tour_guid IS NOT NULL AND OLD.tour_guid IS DISTINCT FROM NEW.tour_guid THEN
            SELECT GREATEST(COALESCE(t.price, 0) - COALESCE(SUM(p.amount), 0), 0) INTO v_total_unpaid
            FROM tbl_tour t LEFT JOIN "tbl_TTP_payments" p ON p.tour_guid = t.guid
            WHERE t.guid = OLD.tour_guid GROUP BY t.guid, t.price;
            UPDATE tbl_total_calculations SET credit_price = COALESCE(v_total_unpaid, 0), "updatedAt" = NOW() WHERE guid = OLD.tour_guid;
          END IF;

          -- Transfer
          IF TG_OP = 'DELETE' THEN
            v_guid := OLD.transfer_guid;
          ELSE
            v_guid := NEW.transfer_guid;
          END IF;
          IF v_guid IS NOT NULL THEN
            SELECT GREATEST(COALESCE(tr.price, 0) - COALESCE(SUM(p.amount), 0), 0) INTO v_total_unpaid
            FROM tbl_transfer tr LEFT JOIN "tbl_TTP_payments" p ON p.transfer_guid = tr.guid
            WHERE tr.guid = v_guid GROUP BY tr.guid, tr.price;
            UPDATE tbl_total_calculations SET credit_price = COALESCE(v_total_unpaid, 0), "updatedAt" = NOW() WHERE guid = v_guid;
          END IF;
          IF TG_OP = 'UPDATE' AND OLD.transfer_guid IS NOT NULL AND OLD.transfer_guid IS DISTINCT FROM NEW.transfer_guid THEN
            SELECT GREATEST(COALESCE(tr.price, 0) - COALESCE(SUM(p.amount), 0), 0) INTO v_total_unpaid
            FROM tbl_transfer tr LEFT JOIN "tbl_TTP_payments" p ON p.transfer_guid = tr.guid
            WHERE tr.guid = OLD.transfer_guid GROUP BY tr.guid, tr.price;
            UPDATE tbl_total_calculations SET credit_price = COALESCE(v_total_unpaid, 0), "updatedAt" = NOW() WHERE guid = OLD.transfer_guid;
          END IF;

          -- Package
          IF TG_OP = 'DELETE' THEN
            v_guid := OLD.package_guid;
          ELSE
            v_guid := NEW.package_guid;
          END IF;
          IF v_guid IS NOT NULL THEN
            SELECT GREATEST(COALESCE(pk.price, 0) - COALESCE(SUM(p.amount), 0), 0) INTO v_total_unpaid
            FROM tbl_package pk LEFT JOIN "tbl_TTP_payments" p ON p.package_guid = pk.guid
            WHERE pk.guid = v_guid GROUP BY pk.guid, pk.price;
            UPDATE tbl_total_calculations SET credit_price = COALESCE(v_total_unpaid, 0), "updatedAt" = NOW() WHERE guid = v_guid;
          END IF;
          IF TG_OP = 'UPDATE' AND OLD.package_guid IS NOT NULL AND OLD.package_guid IS DISTINCT FROM NEW.package_guid THEN
            SELECT GREATEST(COALESCE(pk.price, 0) - COALESCE(SUM(p.amount), 0), 0) INTO v_total_unpaid
            FROM tbl_package pk LEFT JOIN "tbl_TTP_payments" p ON p.package_guid = pk.guid
            WHERE pk.guid = OLD.package_guid GROUP BY pk.guid, pk.price;
            UPDATE tbl_total_calculations SET credit_price = COALESCE(v_total_unpaid, 0), "updatedAt" = NOW() WHERE guid = OLD.package_guid;
          END IF;

          IF TG_OP = 'DELETE' THEN
            RETURN OLD;
          ELSE
            RETURN NEW;
          END IF;
        END;
        $$ LANGUAGE plpgsql;
      `);

      await sequelize.query(`
        DROP TRIGGER IF EXISTS trg_sync_ttp_payment_to_total_calculations ON "tbl_TTP_payments";
        CREATE TRIGGER trg_sync_ttp_payment_to_total_calculations
        AFTER INSERT OR UPDATE OR DELETE ON "tbl_TTP_payments"
        FOR EACH ROW EXECUTE FUNCTION sync_ttp_payment_to_total_calculations();
      `);

      // -------------------------------------------------------------
      // 10. Translation Trigger (tbl_general_translations)
      // -------------------------------------------------------------
      await sequelize.query(`
        CREATE OR REPLACE FUNCTION sync_translation_to_total_calculations()
        RETURNS TRIGGER AS $$
        DECLARE
          v_office_guid UUID;
          v_credit_price DECIMAL(12, 2);
          v_status VARCHAR(50);
        BEGIN
          IF TG_OP = 'DELETE' THEN
            DELETE FROM tbl_total_calculations WHERE guid = OLD.guid;
            RETURN OLD;
          END IF;

          SELECT office_guid INTO v_office_guid 
          FROM tbl_employees 
          WHERE guid = NEW.opr_guid;

          SELECT GREATEST(COALESCE(NEW.price, 0) - COALESCE(SUM(amount), 0), 0) INTO v_credit_price 
          FROM tbl_trans_payments 
          WHERE translation_guid = NEW.guid;

          -- status 'true' / 'false' is urgent / normal, not a payment state.
          IF NEW.status = '0' OR NEW.status = 'REFUND' THEN
            v_status := 'REFUND';
          ELSIF NEW.is_paid IS TRUE OR NEW.status = 'paid' THEN
            v_status := 'paid';
          ELSE
            v_status := 'notpaid';
          END IF;

          INSERT INTO tbl_total_calculations (
            guid,
            category_guid,
            datetime,
            receiver_opr_guid,
            office_guid,
            status,
            net_price,
            sale_price,
            currency,
            profit,
            credit_price,
            is_manual,
            "createdAt",
            "updatedAt"
          ) VALUES (
            NEW.guid,
            '${SYSTEM_CATEGORIES.TRANSLATION}'::uuid,
            CASE 
              WHEN NEW.received_day IS NOT NULL THEN (NEW.received_day::text || ' ' || COALESCE(NEW.received_time::text, '00:00:00'))::timestamp
              ELSE COALESCE(NEW."createdAt", NOW())
            END,
            NEW.opr_guid,
            v_office_guid,
            v_status,
            COALESCE(NEW.expense_price, 0),
            COALESCE(NEW.price, 0),
            'TMT',
            COALESCE(NEW.price, 0) - COALESCE(NEW.expense_price, 0),
            COALESCE(v_credit_price, 0),
            FALSE,
            NOW(),
            NOW()
          )
          ON CONFLICT (guid) DO UPDATE SET
            category_guid = EXCLUDED.category_guid,
            datetime = EXCLUDED.datetime,
            receiver_opr_guid = EXCLUDED.receiver_opr_guid,
            office_guid = EXCLUDED.office_guid,
            status = EXCLUDED.status,
            net_price = EXCLUDED.net_price,
            sale_price = EXCLUDED.sale_price,
            currency = EXCLUDED.currency,
            profit = EXCLUDED.profit,
            credit_price = EXCLUDED.credit_price,
            is_manual = FALSE,
            "updatedAt" = NOW();

          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `);

      await sequelize.query(`
        DROP TRIGGER IF EXISTS trg_sync_translation_to_total_calculations ON tbl_general_translations;
        CREATE TRIGGER trg_sync_translation_to_total_calculations
        AFTER INSERT OR UPDATE OR DELETE ON tbl_general_translations
        FOR EACH ROW EXECUTE FUNCTION sync_translation_to_total_calculations();
      `);

      // -------------------------------------------------------------
      // 11. Trans Payments Trigger (tbl_trans_payments)
      // -------------------------------------------------------------
      await sequelize.query(`
        CREATE OR REPLACE FUNCTION sync_trans_payment_to_total_calculations()
        RETURNS TRIGGER AS $$
        DECLARE
          v_total_paid DECIMAL(12, 2);
          v_guid UUID;
        BEGIN
          IF TG_OP = 'DELETE' THEN
            v_guid := OLD.translation_guid;
          ELSE
            v_guid := NEW.translation_guid;
          END IF;

          IF v_guid IS NOT NULL THEN
            SELECT GREATEST(COALESCE(gt.price, 0) - COALESCE(SUM(tp.amount), 0), 0) INTO v_total_paid 
            FROM tbl_general_translations gt
            LEFT JOIN tbl_trans_payments tp ON tp.translation_guid = gt.guid
            WHERE gt.guid = v_guid
            GROUP BY gt.guid, gt.price;

            UPDATE tbl_total_calculations 
            SET credit_price = COALESCE(v_total_paid, 0), "updatedAt" = NOW() 
            WHERE guid = v_guid;
          END IF;

          IF TG_OP = 'UPDATE' AND OLD.translation_guid IS NOT NULL AND OLD.translation_guid IS DISTINCT FROM NEW.translation_guid THEN
            SELECT GREATEST(COALESCE(gt.price, 0) - COALESCE(SUM(tp.amount), 0), 0) INTO v_total_paid 
            FROM tbl_general_translations gt
            LEFT JOIN tbl_trans_payments tp ON tp.translation_guid = gt.guid
            WHERE gt.guid = OLD.translation_guid
            GROUP BY gt.guid, gt.price;

            UPDATE tbl_total_calculations 
            SET credit_price = COALESCE(v_total_paid, 0), "updatedAt" = NOW() 
            WHERE guid = OLD.translation_guid;
          END IF;

          IF TG_OP = 'DELETE' THEN
            RETURN OLD;
          ELSE
            RETURN NEW;
          END IF;
        END;
        $$ LANGUAGE plpgsql;
      `);

      await sequelize.query(`
        DROP TRIGGER IF EXISTS trg_sync_trans_payment_to_total_calculations ON tbl_trans_payments;
        CREATE TRIGGER trg_sync_trans_payment_to_total_calculations
        AFTER INSERT OR UPDATE OR DELETE ON tbl_trans_payments
        FOR EACH ROW EXECUTE FUNCTION sync_trans_payment_to_total_calculations();
      `);

      // -------------------------------------------------------------
      // Initial Backfill for existing translations
      // -------------------------------------------------------------
      await sequelize.query(`
        INSERT INTO tbl_total_calculations (
          guid,
          category_guid,
          datetime,
          receiver_opr_guid,
          office_guid,
          status,
          net_price,
          sale_price,
          currency,
          profit,
          credit_price,
          is_manual,
          "createdAt",
          "updatedAt"
        )
        SELECT
          gt.guid,
          '${SYSTEM_CATEGORIES.TRANSLATION}'::uuid,
          CASE 
            WHEN gt.received_day IS NOT NULL THEN (gt.received_day::text || ' ' || COALESCE(gt.received_time::text, '00:00:00'))::timestamp
            ELSE COALESCE(gt."createdAt", NOW())
          END,
          gt.opr_guid,
          emp.office_guid,
          CASE 
            WHEN gt.status = '0' OR gt.status = 'REFUND' THEN 'REFUND'
            WHEN gt.is_paid IS TRUE OR gt.status = 'paid' THEN 'paid'
            ELSE 'notpaid'
          END,
          COALESCE(gt.expense_price, 0),
          COALESCE(gt.price, 0),
          'TMT',
          COALESCE(gt.price, 0) - COALESCE(gt.expense_price, 0),
          COALESCE(gt.price, 0) - COALESCE((SELECT SUM(tp.amount) FROM tbl_trans_payments tp WHERE tp.translation_guid = gt.guid), 0),
          FALSE,
          COALESCE(gt."createdAt", NOW()),
          NOW()
        FROM tbl_general_translations gt
        LEFT JOIN tbl_employees emp ON emp.guid = gt.opr_guid
        ON CONFLICT (guid) DO UPDATE SET
          category_guid = EXCLUDED.category_guid,
          datetime = EXCLUDED.datetime,
          receiver_opr_guid = EXCLUDED.receiver_opr_guid,
          office_guid = EXCLUDED.office_guid,
          status = EXCLUDED.status,
          net_price = EXCLUDED.net_price,
          sale_price = EXCLUDED.sale_price,
          currency = EXCLUDED.currency,
          profit = EXCLUDED.profit,
          credit_price = EXCLUDED.credit_price,
          is_manual = FALSE,
          "updatedAt" = NOW();
      `);

      // -------------------------------------------------------------
      // 12. Referral Letter Trigger (tbl_refferal_letter)
      // -------------------------------------------------------------
      await sequelize.query(`
        CREATE OR REPLACE FUNCTION sync_refferal_letter_to_total_calculations()
        RETURNS TRIGGER AS $$
        DECLARE
          v_office_guid UUID;
        BEGIN
          IF TG_OP = 'DELETE' THEN
            DELETE FROM tbl_total_calculations WHERE guid = OLD.guid;
            RETURN OLD;
          END IF;

          SELECT office_guid INTO v_office_guid 
          FROM tbl_employees 
          WHERE guid = NEW.received_opr_guid;

          INSERT INTO tbl_total_calculations (
            guid,
            category_guid,
            datetime,
            receiver_opr_guid,
            office_guid,
            status,
            net_price,
            sale_price,
            currency,
            profit,
            credit_price,
            is_manual,
            "createdAt",
            "updatedAt"
          ) VALUES (
            NEW.guid,
            '${SYSTEM_CATEGORIES.REFERRAL_LETTER}'::uuid,
            COALESCE(NEW."createdAt", NOW()),
            NEW.received_opr_guid,
            v_office_guid,
            NULL,
            0,
            COALESCE(NEW.price, 0),
            COALESCE(NEW.currency, 'TMT'),
            0,
            COALESCE(NEW.price, 0),
            FALSE,
            NOW(),
            NOW()
          )
          ON CONFLICT (guid) DO UPDATE SET
            category_guid = EXCLUDED.category_guid,
            datetime = EXCLUDED.datetime,
            receiver_opr_guid = EXCLUDED.receiver_opr_guid,
            office_guid = EXCLUDED.office_guid,
            status = EXCLUDED.status,
            net_price = EXCLUDED.net_price,
            sale_price = EXCLUDED.sale_price,
            currency = EXCLUDED.currency,
            profit = EXCLUDED.profit,
            credit_price = EXCLUDED.credit_price,
            is_manual = FALSE,
            "updatedAt" = NOW();

          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `);

      await sequelize.query(`
        DROP TRIGGER IF EXISTS trg_sync_refferal_letter_to_total_calculations ON tbl_refferal_letter;
        CREATE TRIGGER trg_sync_refferal_letter_to_total_calculations
        AFTER INSERT OR UPDATE OR DELETE ON tbl_refferal_letter
        FOR EACH ROW EXECUTE FUNCTION sync_refferal_letter_to_total_calculations();
      `);

      // -------------------------------------------------------------
      // Initial Backfill for existing referral letters
      // -------------------------------------------------------------
      await sequelize.query(`
        INSERT INTO tbl_total_calculations (
          guid,
          category_guid,
          datetime,
          receiver_opr_guid,
          office_guid,
          status,
          net_price,
          sale_price,
          currency,
          profit,
          credit_price,
          is_manual,
          "createdAt",
          "updatedAt"
        )
        SELECT
          rl.guid,
          '${SYSTEM_CATEGORIES.REFERRAL_LETTER}'::uuid,
          COALESCE(rl."createdAt", NOW()),
          rl.received_opr_guid,
          emp.office_guid,
          NULL,
          0,
          COALESCE(rl.price, 0),
          COALESCE(rl.currency, 'TMT'),
          0,
          0,
          FALSE,
          COALESCE(rl."createdAt", NOW()),
          NOW()
        FROM tbl_refferal_letter rl
        LEFT JOIN tbl_employees emp ON emp.guid = rl.received_opr_guid
        ON CONFLICT (guid) DO UPDATE SET
          category_guid = EXCLUDED.category_guid,
          datetime = EXCLUDED.datetime,
          receiver_opr_guid = EXCLUDED.receiver_opr_guid,
          office_guid = EXCLUDED.office_guid,
          status = EXCLUDED.status,
          net_price = EXCLUDED.net_price,
          sale_price = EXCLUDED.sale_price,
          currency = EXCLUDED.currency,
          profit = EXCLUDED.profit,
          credit_price = EXCLUDED.credit_price,
          is_manual = FALSE,
          "updatedAt" = NOW();
      `);

      // -------------------------------------------------------------
      // 13. Cafeteria Trigger (tbl_cafeteria)
      // -------------------------------------------------------------
      // Each cafeteria row carries its own office (picked in the form). Rows
      // from before that column get their creator's office once.
      await sequelize.query(`
        ALTER TABLE tbl_cafeteria ADD COLUMN IF NOT EXISTS office_guid UUID;
        UPDATE tbl_cafeteria c
        SET office_guid = e.office_guid
        FROM tbl_employees e
        WHERE c.office_guid IS NULL AND e.guid = c.created_by_guid AND e.office_guid IS NOT NULL;
      `);
      await sequelize.query(`
        CREATE OR REPLACE FUNCTION sync_cafeteria_to_total_calculations()
        RETURNS TRIGGER AS $$
        DECLARE
          v_office_guid UUID;
        BEGIN
          IF TG_OP = 'DELETE' THEN
            DELETE FROM tbl_total_calculations WHERE guid = OLD.guid;
            RETURN OLD;
          END IF;

          -- The row's own office; the creator's office only when it has none.
          v_office_guid := NEW.office_guid;
          IF v_office_guid IS NULL THEN
            SELECT office_guid INTO v_office_guid
            FROM tbl_employees
            WHERE guid = NEW.created_by_guid;
          END IF;

          INSERT INTO tbl_total_calculations (
            guid,
            category_guid,
            datetime,
            receiver_opr_guid,
            office_guid,
            status,
            net_price,
            sale_price,
            currency,
            profit,
            credit_price,
            is_manual,
            "createdAt",
            "updatedAt"
          ) VALUES (
            NEW.guid,
            '${SYSTEM_CATEGORIES.CAFETERIA}'::uuid,
            COALESCE(NEW.date, COALESCE(NEW."createdAt", NOW())),
            NEW.created_by_guid,
            v_office_guid,
            NULL,
            CASE WHEN NEW.type = FALSE THEN COALESCE(NEW.amount, 0) ELSE 0 END,
            CASE WHEN NEW.type = TRUE  THEN COALESCE(NEW.amount, 0) ELSE 0 END,
            COALESCE(NEW.currency, 'TMT'),
            0,
            0,
            FALSE,
            NOW(),
            NOW()
          )
          ON CONFLICT (guid) DO UPDATE SET
            category_guid = EXCLUDED.category_guid,
            datetime = EXCLUDED.datetime,
            receiver_opr_guid = EXCLUDED.receiver_opr_guid,
            office_guid = EXCLUDED.office_guid,
            status = EXCLUDED.status,
            net_price = EXCLUDED.net_price,
            sale_price = EXCLUDED.sale_price,
            currency = EXCLUDED.currency,
            profit = EXCLUDED.profit,
            credit_price = EXCLUDED.credit_price,
            is_manual = FALSE,
            "updatedAt" = NOW();

          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `);

      await sequelize.query(`
        DROP TRIGGER IF EXISTS trg_sync_cafeteria_to_total_calculations ON tbl_cafeteria;
        CREATE TRIGGER trg_sync_cafeteria_to_total_calculations
        AFTER INSERT OR UPDATE OR DELETE ON tbl_cafeteria
        FOR EACH ROW EXECUTE FUNCTION sync_cafeteria_to_total_calculations();
      `);

      // -------------------------------------------------------------
      // Initial Backfill for existing cafeteria records
      // -------------------------------------------------------------
      await sequelize.query(`
        INSERT INTO tbl_total_calculations (
          guid,
          category_guid,
          datetime,
          receiver_opr_guid,
          office_guid,
          status,
          net_price,
          sale_price,
          currency,
          profit,
          credit_price,
          is_manual,
          "createdAt",
          "updatedAt"
        )
        SELECT
          c.guid,
          '${SYSTEM_CATEGORIES.CAFETERIA}'::uuid,
          COALESCE(c.date, COALESCE(c."createdAt", NOW())),
          c.created_by_guid,
          COALESCE(c.office_guid, emp.office_guid),
          NULL,
          CASE WHEN c.type = FALSE THEN COALESCE(c.amount, 0) ELSE 0 END,
          CASE WHEN c.type = TRUE  THEN COALESCE(c.amount, 0) ELSE 0 END,
          COALESCE(c.currency, 'TMT'),
          0,
          0,
          FALSE,
          COALESCE(c."createdAt", NOW()),
          NOW()
        FROM tbl_cafeteria c
        LEFT JOIN tbl_employees emp ON emp.guid = c.created_by_guid
        ON CONFLICT (guid) DO UPDATE SET
          category_guid = EXCLUDED.category_guid,
          datetime = EXCLUDED.datetime,
          receiver_opr_guid = EXCLUDED.receiver_opr_guid,
          office_guid = EXCLUDED.office_guid,
          status = EXCLUDED.status,
          net_price = EXCLUDED.net_price,
          sale_price = EXCLUDED.sale_price,
          currency = EXCLUDED.currency,
          profit = EXCLUDED.profit,
          credit_price = EXCLUDED.credit_price,
          is_manual = FALSE,
          "updatedAt" = NOW();
      `);


      // -------------------------------------------------------------
      // Visa Trigger (tbl_visa)
      // -------------------------------------------------------------
      await sequelize.query(`
        CREATE OR REPLACE FUNCTION sync_visa_to_total_calculations()
        RETURNS TRIGGER AS $$
        DECLARE
          v_office_guid UUID;
          v_credit_tmt DECIMAL(12, 2);
          v_credit_usd DECIMAL(12, 2);
          v_status VARCHAR(50);
          v_profit_tmt DECIMAL(12, 2);
          v_profit_usd DECIMAL(12, 2);
          v_net_tmt DECIMAL(12, 2);
          v_net_usd DECIMAL(12, 2);
        BEGIN
          IF TG_OP = 'DELETE' THEN
            DELETE FROM tbl_total_calculations WHERE guid = OLD.guid;
            RETURN OLD;
          END IF;

          SELECT office_guid INTO v_office_guid
          FROM tbl_employees
          WHERE guid = NEW.receiver_opr_guid;

          SELECT
            GREATEST(COALESCE(NEW.price_tmt, 0) - COALESCE(SUM(CASE WHEN UPPER(TRIM(currency)) = 'TMT' THEN amount ELSE 0 END), 0), 0),
            GREATEST(COALESCE(NEW.price_usd, 0) - COALESCE(SUM(CASE WHEN UPPER(TRIM(currency)) = 'USD' THEN amount ELSE 0 END), 0), 0)
          INTO v_credit_tmt, v_credit_usd
          FROM tbl_visa_payments
          WHERE visa_guid = NEW.guid;

          -- The profit is entered per currency; the cost is what is left of the
          -- price. A visa with no profit entered keeps cost 0, as before: its
          -- cost is unknown, not the whole price.
          v_profit_tmt := COALESCE(NEW.profit_tmt, 0);
          v_profit_usd := COALESCE(NEW.profit_usd, 0);
          v_net_tmt := CASE WHEN v_profit_tmt > 0 THEN GREATEST(COALESCE(NEW.price_tmt, 0) - v_profit_tmt, 0) ELSE 0 END;
          v_net_usd := CASE WHEN v_profit_usd > 0 THEN GREATEST(COALESCE(NEW.price_usd, 0) - v_profit_usd, 0) ELSE 0 END;

          IF NEW.status = 3 THEN
            v_status := 'REFUND';
          ELSIF NEW.is_paid IS TRUE THEN
            v_status := 'paid';
          ELSE
            v_status := 'notpaid';
          END IF;

          INSERT INTO tbl_total_calculations (
            guid,
            category_guid,
            datetime,
            receiver_opr_guid,
            office_guid,
            status,
            net_price,
            sale_price,
            sale_price_usd,
            currency,
            profit,
            net_price_usd,
            profit_usd,
            credit_price,
            credit_usd,
            is_manual,
            "createdAt",
            "updatedAt"
          ) VALUES (
            NEW.guid,
            '${SYSTEM_CATEGORIES.VISA}'::uuid,
            COALESCE(NEW.datetime, NOW()),
            NEW.receiver_opr_guid,
            v_office_guid,
            v_status,
            v_net_tmt,
            COALESCE(NEW.price_tmt, 0),
            COALESCE(NEW.price_usd, 0),
            'TMT',
            v_profit_tmt,
            v_net_usd,
            v_profit_usd,
            COALESCE(v_credit_tmt, 0),
            COALESCE(v_credit_usd, 0),
            FALSE,
            NOW(),
            NOW()
          )
          ON CONFLICT (guid) DO UPDATE SET
            category_guid    = EXCLUDED.category_guid,
            datetime         = EXCLUDED.datetime,
            receiver_opr_guid = EXCLUDED.receiver_opr_guid,
            office_guid      = EXCLUDED.office_guid,
            status           = EXCLUDED.status,
            net_price        = EXCLUDED.net_price,
            sale_price       = EXCLUDED.sale_price,
            sale_price_usd   = EXCLUDED.sale_price_usd,
            currency         = EXCLUDED.currency,
            profit           = EXCLUDED.profit,
            net_price_usd    = EXCLUDED.net_price_usd,
            profit_usd       = EXCLUDED.profit_usd,
            credit_price     = EXCLUDED.credit_price,
            credit_usd       = EXCLUDED.credit_usd,
            is_manual        = FALSE,
            "updatedAt"      = NOW();

          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `);

      await sequelize.query(`
        DROP TRIGGER IF EXISTS trg_sync_visa_to_total_calculations ON tbl_visa;
        CREATE TRIGGER trg_sync_visa_to_total_calculations
        AFTER INSERT OR UPDATE OR DELETE ON tbl_visa
        FOR EACH ROW EXECUTE FUNCTION sync_visa_to_total_calculations();
      `);

      // -------------------------------------------------------------
      // Visa Payment Trigger (tbl_visa_payments)
      // -------------------------------------------------------------
      await sequelize.query(`
        CREATE OR REPLACE FUNCTION sync_visa_payment_to_total_calculations()
        RETURNS TRIGGER AS $$
        DECLARE
          v_target_visa_guid UUID;
          v_credit_tmt DECIMAL(12, 2);
          v_credit_usd DECIMAL(12, 2);
        BEGIN
          IF TG_OP = 'DELETE' THEN
            v_target_visa_guid := OLD.visa_guid;
          ELSE
            v_target_visa_guid := NEW.visa_guid;
          END IF;

          IF v_target_visa_guid IS NOT NULL THEN
            SELECT
              GREATEST(COALESCE(v.price_tmt, 0) - COALESCE(SUM(CASE WHEN UPPER(TRIM(vp.currency)) = 'TMT' THEN vp.amount ELSE 0 END), 0), 0),
              GREATEST(COALESCE(v.price_usd, 0) - COALESCE(SUM(CASE WHEN UPPER(TRIM(vp.currency)) = 'USD' THEN vp.amount ELSE 0 END), 0), 0)
            INTO v_credit_tmt, v_credit_usd
            FROM tbl_visa v
            LEFT JOIN tbl_visa_payments vp ON vp.visa_guid = v.guid
            WHERE v.guid = v_target_visa_guid
            GROUP BY v.guid, v.price_tmt, v.price_usd;

            UPDATE tbl_total_calculations
            SET credit_price = COALESCE(v_credit_tmt, 0),
                credit_usd   = COALESCE(v_credit_usd, 0),
                "updatedAt"  = NOW()
            WHERE guid = v_target_visa_guid;
          END IF;

          -- Handle UPDATE where visa_guid changed
          IF TG_OP = 'UPDATE' AND OLD.visa_guid IS NOT NULL AND OLD.visa_guid IS DISTINCT FROM NEW.visa_guid THEN
            SELECT
              GREATEST(COALESCE(v.price_tmt, 0) - COALESCE(SUM(CASE WHEN UPPER(TRIM(vp.currency)) = 'TMT' THEN vp.amount ELSE 0 END), 0), 0),
              GREATEST(COALESCE(v.price_usd, 0) - COALESCE(SUM(CASE WHEN UPPER(TRIM(vp.currency)) = 'USD' THEN vp.amount ELSE 0 END), 0), 0)
            INTO v_credit_tmt, v_credit_usd
            FROM tbl_visa v
            LEFT JOIN tbl_visa_payments vp ON vp.visa_guid = v.guid
            WHERE v.guid = OLD.visa_guid
            GROUP BY v.guid, v.price_tmt, v.price_usd;

            UPDATE tbl_total_calculations
            SET credit_price = COALESCE(v_credit_tmt, 0),
                credit_usd   = COALESCE(v_credit_usd, 0),
                "updatedAt"  = NOW()
            WHERE guid = OLD.visa_guid;
          END IF;

          IF TG_OP = 'DELETE' THEN
            RETURN OLD;
          ELSE
            RETURN NEW;
          END IF;
        END;
        $$ LANGUAGE plpgsql;
      `);

      await sequelize.query(`
        DROP TRIGGER IF EXISTS trg_sync_visa_payment_to_total_calculations ON tbl_visa_payments;
        CREATE TRIGGER trg_sync_visa_payment_to_total_calculations
        AFTER INSERT OR UPDATE OR DELETE ON tbl_visa_payments
        FOR EACH ROW EXECUTE FUNCTION sync_visa_payment_to_total_calculations();
      `);

      // -------------------------------------------------------------
      // Backfill: sales that never reached the cash flow
      // -------------------------------------------------------------
      // The triggers above only fire on a write, so a sale entered before its
      // trigger existed has no cash-flow row. A no-op update on exactly those
      // rows fires the row's own trigger, which writes it by the same rules as
      // any new sale — the column mapping stays in one place. Rows already in
      // the cash flow are not touched, so this is a no-op once they all are.
      for (const table of ['tbl_b2b', 'tbl_airway', 'tbl_railway', 'tbl_hotel', 'tbl_tour', 'tbl_transfer', 'tbl_package', 'tbl_visa']) {
        await sequelize.query(`
          UPDATE "${table}" src
          SET guid = src.guid
          WHERE NOT EXISTS (SELECT 1 FROM tbl_total_calculations tc WHERE tc.guid = src.guid);
        `);
      }

      // -------------------------------------------------------------
      // Recalculate credit_price / credit_usd for all existing rows
      // -------------------------------------------------------------
      await sequelize.query(`
        UPDATE tbl_total_calculations tc
        SET credit_price = GREATEST(COALESCE(b.sale_price, 0) - COALESCE(p.paid, 0), 0)
        FROM tbl_b2b b
        LEFT JOIN (SELECT b2b_guid, SUM(amount) AS paid FROM tbl_ticket_payments GROUP BY b2b_guid) p ON p.b2b_guid = b.guid
        WHERE tc.guid = b.guid;

        UPDATE tbl_total_calculations tc
        SET credit_price = GREATEST(COALESCE(a.price, 0) - COALESCE(p.paid, 0), 0)
        FROM tbl_airway a
        LEFT JOIN (SELECT airway_guid, SUM(amount) AS paid FROM "tbl_HAR_payments" WHERE airway_guid IS NOT NULL GROUP BY airway_guid) p ON p.airway_guid = a.guid
        WHERE tc.guid = a.guid;

        UPDATE tbl_total_calculations tc
        SET credit_price = GREATEST(COALESCE(r.price, 0) - COALESCE(p.paid, 0), 0)
        FROM tbl_railway r
        LEFT JOIN (SELECT railway_guid, SUM(amount) AS paid FROM "tbl_HAR_payments" WHERE railway_guid IS NOT NULL GROUP BY railway_guid) p ON p.railway_guid = r.guid
        WHERE tc.guid = r.guid;

        UPDATE tbl_total_calculations tc
        SET credit_price = GREATEST(COALESCE(h.price, 0) - COALESCE(p.paid, 0), 0)
        FROM tbl_hotel h
        LEFT JOIN (SELECT hotel_guid, SUM(amount) AS paid FROM "tbl_HAR_payments" WHERE hotel_guid IS NOT NULL GROUP BY hotel_guid) p ON p.hotel_guid = h.guid
        WHERE tc.guid = h.guid;

        UPDATE tbl_total_calculations tc
        SET credit_price = GREATEST(COALESCE(t.price, 0) - COALESCE(p.paid, 0), 0)
        FROM tbl_tour t
        LEFT JOIN (SELECT tour_guid, SUM(amount) AS paid FROM "tbl_TTP_payments" WHERE tour_guid IS NOT NULL GROUP BY tour_guid) p ON p.tour_guid = t.guid
        WHERE tc.guid = t.guid;

        UPDATE tbl_total_calculations tc
        SET credit_price = GREATEST(COALESCE(tr.price, 0) - COALESCE(p.paid, 0), 0)
        FROM tbl_transfer tr
        LEFT JOIN (SELECT transfer_guid, SUM(amount) AS paid FROM "tbl_TTP_payments" WHERE transfer_guid IS NOT NULL GROUP BY transfer_guid) p ON p.transfer_guid = tr.guid
        WHERE tc.guid = tr.guid;

        UPDATE tbl_total_calculations tc
        SET credit_price = GREATEST(COALESCE(pk.price, 0) - COALESCE(p.paid, 0), 0)
        FROM tbl_package pk
        LEFT JOIN (SELECT package_guid, SUM(amount) AS paid FROM "tbl_TTP_payments" WHERE package_guid IS NOT NULL GROUP BY package_guid) p ON p.package_guid = pk.guid
        WHERE tc.guid = pk.guid;

        UPDATE tbl_total_calculations tc
        SET credit_price = GREATEST(COALESCE(gt.price, 0) - COALESCE(p.paid, 0), 0)
        FROM tbl_general_translations gt
        LEFT JOIN (SELECT translation_guid, SUM(amount) AS paid FROM tbl_trans_payments WHERE translation_guid IS NOT NULL GROUP BY translation_guid) p ON p.translation_guid = gt.guid
        WHERE tc.guid = gt.guid;

        UPDATE tbl_total_calculations tc
        SET credit_price = COALESCE(rl.price, 0)
        FROM tbl_refferal_letter rl
        WHERE tc.guid = rl.guid;

        UPDATE tbl_total_calculations tc
        SET credit_price = GREATEST(COALESCE(v.price_tmt, 0) - COALESCE(p.paid_tmt, 0), 0),
            credit_usd   = GREATEST(COALESCE(v.price_usd, 0) - COALESCE(p.paid_usd, 0), 0)
        FROM tbl_visa v
        LEFT JOIN (
          SELECT visa_guid,
            SUM(CASE WHEN UPPER(TRIM(currency)) = 'TMT' THEN amount ELSE 0 END) AS paid_tmt,
            SUM(CASE WHEN UPPER(TRIM(currency)) = 'USD' THEN amount ELSE 0 END) AS paid_usd
          FROM tbl_visa_payments
          WHERE visa_guid IS NOT NULL
          GROUP BY visa_guid
        ) p ON p.visa_guid = v.guid
        WHERE tc.guid = v.guid;
      `);

      console.log('✅ B2B, Airway, Railway, Hotel, Tour, Transfer, Package, Translation, Referral Letter, Aylyk, Cafeteria, Visa we Töleg triggerlary created successfully');
    } catch (error) {
      console.error('❌ Total Calculations trigger creating error:', error);
    }
  }
}