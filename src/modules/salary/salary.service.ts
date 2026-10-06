import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { DataTypes, Op, Transaction, fn, col, literal } from 'sequelize';
import { I18nService } from 'nestjs-i18n';
import { Salary } from './entities/salary.entity';
import { SalaryMonth } from './entities/salary-month.entity';
import { CreateSalaryDto } from './dto/create-salary.dto';
import { UpdateSalaryDto } from './dto/update-salary.dto';
import { GenerateSalaryMonthDto, LockSalaryMonthDto, MarkSalaryPaidDto } from './dto/salary-actions.dto';
import { Employee } from '../employee/entities/employee.entity';
import { User } from '../user/entities/user.entity';
import { Office } from '../office/entities/office.entity';
import { TotalCalculation } from '../total_calculations/entities/total_calculation.entity';
import { SYSTEM_CATEGORIES } from '../total_calculations/total_calculations.service';
import { errorResponse } from '../../helpers/responseFunctions';
import { HttpStatuses } from '../../helpers/httpStatuses.enum';
import { UserType } from '../../enums/enums';

type SalaryFilters = {
  search?: string;
  month?: string;
  office_guid?: string;
  employee_guid?: string;
};

type SalaryScope = {
  employeeGuid: string | null;
  officeGuid: string | null;
  allOffices: boolean;
};

type ServiceResult = { status: number; message: string;[key: string]: any };

const round2 = (value: number) => Math.round(value * 100) / 100;

const SUMMARY_FIELDS = [
  'base_salary',
  'card_amount',
  'advance',
  'cafeteria_credit',
  'loan',
  'bonus',
  'total_amount',
  'payable_amount',
] as const;

const PREVIOUS_FIELDS = [
  'base_salary',
  'work_days',
  'worked_days',
  'card_amount',
  'advance',
  'cafeteria_credit',
  'loan',
  'bonus',
] as const;

const CARRY_OVER_FIELDS = ['base_salary', 'card_amount'] as const;

const shiftMonth = (month: string, delta: number) => {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
};

const workDaysInMonth = (month: string) => {
  const [y, m] = month.split('-').map(Number);
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  let count = 0;
  for (let day = 1; day <= days; day += 1) {
    if (new Date(Date.UTC(y, m - 1, day)).getUTCDay() !== 0) count += 1;
  }
  return count;
};

const workDaysFrom = (month: string, fromDay: number) => {
  const [y, m] = month.split('-').map(Number);
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  let count = 0;
  for (let day = Math.max(1, fromDay); day <= days; day += 1) {
    if (new Date(Date.UTC(y, m - 1, day)).getUTCDay() !== 0) count += 1;
  }
  return count;
};

const monthOf = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const today = () => new Date().toISOString().slice(0, 10);

const ADDED_COLUMNS = {
  sales_amount: { type: DataTypes.DECIMAL(14, 2), allowNull: true },
  bonus_percent: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
  bonus_currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'TMT' },
};
const USD = 'USD';
const toBonusCurrency = (value: any): 'TMT' | 'USD' => (value === USD ? USD : 'TMT');
const BONUS_TMT_SUM = literal(
  `COALESCE(SUM(CASE WHEN "Salary"."bonus_currency" = '${USD}' THEN 0 ELSE "Salary"."bonus" END), 0)`,
);
const BONUS_USD_SUM = literal(
  `COALESCE(SUM(CASE WHEN "Salary"."bonus_currency" = '${USD}' THEN "Salary"."bonus" ELSE 0 END), 0)`,
);

@Injectable()
export class SalaryService implements OnModuleInit {
  private readonly logger = new Logger(SalaryService.name);

  constructor(
    @InjectModel(Salary) private salaryRepo: typeof Salary,
    @InjectModel(SalaryMonth) private salaryMonthRepo: typeof SalaryMonth,
    @InjectModel(User) private userRepo: typeof User,
    @InjectModel(Employee) private employeeRepo: typeof Employee,
    @InjectModel(TotalCalculation) private totalCalculationModel: typeof TotalCalculation,
    private readonly i18n: I18nService,
  ) { }


  async onModuleInit() {
    const queryInterface = this.salaryRepo.sequelize!.getQueryInterface();
    const table = await queryInterface.describeTable('tbl_salary');
    for (const [name, definition] of Object.entries(ADDED_COLUMNS)) {
      if (!table[name]) {
        await queryInterface.addColumn('tbl_salary', name, definition);
        this.logger.log(`Added column tbl_salary.${name}`);
      }
    }
    try {
      const monthTable = await queryInterface.describeTable('tbl_salary_period');
      for (const name of ['salary_calc_guid', 'salary_usd_calc_guid']) {
        if (!monthTable[name]) {
          await queryInterface.addColumn('tbl_salary_period', name, {
            type: DataTypes.UUID,
            allowNull: true,
          });
          this.logger.log(`Added column tbl_salary_period.${name}`);
        }
      }
    } catch (e) {
      this.logger.error('Error adding cash flow guid columns to tbl_salary_period:', e);
    }
  }



  private async resolveScope(userPayload: any): Promise<SalaryScope> {
    const directGuid = userPayload?.employee_guid || userPayload?.guid || userPayload?.id;
    const isAdmin = String(userPayload?.role || '').toLowerCase() === UserType.ADMIN.toLowerCase();

    let employee: Employee | null = null;
    if (directGuid) {
      employee = await this.employeeRepo.findByPk(directGuid, { attributes: ['guid', 'office_guid'] });
      if (!employee) {
        const user = await this.userRepo.findByPk(directGuid, { attributes: ['guid', 'employee_guid'] });
        if (user?.employee_guid) {
          employee = await this.employeeRepo.findByPk(user.employee_guid, { attributes: ['guid', 'office_guid'] });
        }
      }
    }

    const officeGuid = employee?.office_guid ?? null;
    return {
      employeeGuid: employee?.guid ?? null,
      officeGuid,
      allOffices: !officeGuid && isAdmin,
    };
  }

  private hasAccess(scope: SalaryScope) {
    return scope.allOffices || Boolean(scope.officeGuid);
  }

  private async noOfficeError(lang: string) {
    return errorResponse(HttpStatuses.FORBIDDEN, await this.i18n.translate('salary.noOffice', { lang }));
  }

  private async outOfScopeError(lang: string) {
    return errorResponse(HttpStatuses.FORBIDDEN, await this.i18n.translate('salary.outOfScope', { lang }));
  }

  private scopeWhere(scope: SalaryScope, officeFilter?: string) {
    const where: any = { '$employee.is_active$': true };
    const office = scope.allOffices ? officeFilter : scope.officeGuid;
    if (office) where['$employee.office_guid$'] = office;
    return where;
  }

  private employeeInScope(employee: { office_guid?: string | null; is_active?: boolean } | null, scope: SalaryScope) {
    if (!employee || employee.is_active === false) return false;
    return scope.allOffices || employee.office_guid === scope.officeGuid;
  }

  private async loadScopedRows(guids: string[], scope: SalaryScope) {
    const rows = await this.salaryRepo.findAll({
      where: { guid: guids },
      attributes: ['guid', 'month'],
      include: [{ model: Employee, as: 'employee', attributes: ['guid', 'office_guid', 'is_active'] }],
    });
    const inScope = rows.every((r) => this.employeeInScope(r.employee, scope));
    return { rows, inScope };
  }



  private getIncludes() {
    return [
      {
        model: Employee,
        as: 'employee',
        attributes: ['guid', 'fullName', 'phone_number', 'office_guid', 'is_active'],
        include: [{ model: Office, attributes: ['guid', 'fullName', 'shortName'] }],
      },
      {
        model: Employee,
        as: 'createdBy',
        attributes: ['guid', 'fullName'],
      },
    ];
  }


  private buildWhereConditions(scope: SalaryScope, filters?: SalaryFilters) {
    const where: any = this.scopeWhere(scope, filters?.office_guid);
    if (!filters) return where;
    if (filters.search?.trim()) {
      const term = `%${filters.search.trim()}%`;
      where[Op.or] = [
        { '$employee.fullName$': { [Op.iLike]: term } },
        { note: { [Op.iLike]: term } },
      ];
    }
    if (filters.month) where.month = filters.month;
    if (filters.employee_guid) where.employee_guid = filters.employee_guid;
    return where;
  }


  private calculate(values: {
    base_salary: number; work_days: number; worked_days: number;
    card_amount: number; advance: number; cafeteria_credit: number;
    loan: number; bonus: number; bonus_currency: 'TMT' | 'USD';
  }) {
    const ratio = values.work_days > 0 ? values.worked_days / values.work_days : 1;
    const tmtBonus = values.bonus_currency === USD ? 0 : values.bonus;
    const total_amount = round2(values.base_salary * ratio + tmtBonus);
    const payable_amount = round2(
      total_amount - values.card_amount - values.advance - values.cafeteria_credit - values.loan,
    );
    return { total_amount, payable_amount };
  }


  private normalize(source: any) {
    const num = (v: any) => Number(v ?? 0) || 0;
    const isPercentBonus =
      source.bonus_percent !== null && source.bonus_percent !== undefined && source.bonus_percent !== '';
    const sales_amount = isPercentBonus ? num(source.sales_amount) : null;
    const bonus_percent = isPercentBonus ? num(source.bonus_percent) : null;
    const values = {
      base_salary: num(source.base_salary),
      work_days: num(source.work_days),
      worked_days: num(source.worked_days),
      card_amount: num(source.card_amount),
      advance: num(source.advance),
      cafeteria_credit: num(source.cafeteria_credit),
      loan: num(source.loan),
      bonus: isPercentBonus
        ? round2(((sales_amount as number) * (bonus_percent as number)) / 100)
        : num(source.bonus),
      bonus_currency: toBonusCurrency(source.bonus_currency),
    };
    return { ...values, sales_amount, bonus_percent, ...this.calculate(values) };
  }


  private async isDuplicate(employee_guid: string, month: string, exceptGuid?: string) {
    const where: any = { employee_guid, month };
    if (exceptGuid) where.guid = { [Op.ne]: exceptGuid };
    return (await this.salaryRepo.count({ where })) > 0;
  }


  private async hasLockedPeriod(periods: { month: string; office_guid?: string | null }[]) {
    const unique = new Map<string, { month: string; office_guid: string }>();
    periods.forEach((p) => {
      if (p.month && p.office_guid) unique.set(`${p.month}|${p.office_guid}`, p as any);
    });
    if (unique.size === 0) return false;
    const count = await this.salaryMonthRepo.count({
      where: { is_locked: true, [Op.or]: [...unique.values()] },
    });
    return count > 0;
  }


  private async monthLockedError(lang: string) {
    return errorResponse(HttpStatuses.BAD_REQUEST, await this.i18n.translate('salary.monthLocked', { lang }));
  }



  private async attachPrevious(rows: Salary[]) {
    const plain = rows.map((r) => r.get({ plain: true }) as any);
    if (plain.length === 0) return plain;

    const pairs = plain.map((r) => ({ employee_guid: r.employee_guid, month: shiftMonth(r.month, -1) }));
    const previousRows = await this.salaryRepo.findAll({
      where: { [Op.or]: pairs },
      attributes: ['employee_guid', 'month', ...PREVIOUS_FIELDS],
      raw: true,
    });
    const byKey = new Map(previousRows.map((p: any) => [`${p.employee_guid}|${p.month}`, p]));

    return plain.map((r) => {
      const prev: any = byKey.get(`${r.employee_guid}|${shiftMonth(r.month, -1)}`);
      if (!prev) return { ...r, previous: null };
      const previous: Record<string, number> = {};
      PREVIOUS_FIELDS.forEach((f) => { previous[f] = Number(prev[f] || 0); });
      return { ...r, previous };
    });
  }


  private emptyList(page: number, message: string) {
    return {
      status: 200,
      data: [],
      meta: { totalItems: 0, totalPages: 0, currentPage: page },
      message,
    };
  }


  async getEmployees(
    userPayload: any,
    page: number = 1,
    limit: number = 40,
    search?: string,
    lang: string = 'tk',
    missingMonth?: string,
  ) {
    try {
      const currentPage = Math.max(1, Number(page) || 1);
      const currentLimit = Math.max(1, Math.min(200, Number(limit) || 40));
      const scope = await this.resolveScope(userPayload);
      const message = await this.i18n.translate('salary.fetchSuccess', { lang });
      if (!this.hasAccess(scope)) return this.emptyList(currentPage, message);

      const where: any = { is_active: true };
      if (!scope.allOffices) where.office_guid = scope.officeGuid;
      if (search?.trim()) where.fullName = { [Op.iLike]: `%${search.trim()}%` };
      if (missingMonth && /^\d{4}-(0[1-9]|1[0-2])$/.test(missingMonth)) {
        const existing = await this.salaryRepo.findAll({
          where: { month: missingMonth },
          attributes: ['employee_guid'],
          raw: true,
        });
        const taken = existing.map((e: any) => e.employee_guid);
        if (taken.length) where.guid = { [Op.notIn]: taken };
      }

      const { rows, count } = await this.employeeRepo.findAndCountAll({
        where,
        attributes: ['guid', 'fullName', 'phone_number', 'office_guid'],
        include: [{ model: Office, attributes: ['guid', 'fullName', 'shortName'] }],
        order: [['index_number', 'ASC']],
        limit: currentLimit,
        offset: (currentPage - 1) * currentLimit,
      });
      return {
        status: 200,
        data: rows,
        meta: {
          totalItems: count,
          totalPages: Math.ceil(count / currentLimit),
          currentPage,
        },
        message,
      };
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, await this.i18n.translate('salary.fetchFailed', { lang }), error);
    }
  }


  async addSalary(dto: CreateSalaryDto, userPayload: any, lang: string = 'tk'): Promise<ServiceResult> {
    try {
      const scope = await this.resolveScope(userPayload);
      if (!this.hasAccess(scope)) return this.noOfficeError(lang);

      if (dto.worked_days > dto.work_days) {
        return errorResponse(HttpStatuses.BAD_REQUEST, await this.i18n.translate('salary.workedDaysExceed', { lang }));
      }
      const employee = await this.employeeRepo.findByPk(dto.employee_guid, {
        attributes: ['guid', 'office_guid', 'is_active'],
      });
      if (!employee) {
        return errorResponse(HttpStatuses.NOT_FOUND, await this.i18n.translate('salary.employeeNotFound', { lang }));
      }
      if (!this.employeeInScope(employee, scope)) return this.outOfScopeError(lang);
      if (await this.hasLockedPeriod([{ month: dto.month, office_guid: employee.office_guid }])) {
        return this.monthLockedError(lang);
      }
      if (await this.isDuplicate(dto.employee_guid, dto.month)) {
        return errorResponse(HttpStatuses.CONFLICT, await this.i18n.translate('salary.alreadyExists', { lang }));
      }

      const item = await this.salaryRepo.create({
        ...dto,
        ...this.normalize(dto),
        paid_date: dto.paid_date || null,
        created_by_guid: scope.employeeGuid,
      } as any);

      const createdItem = await this.salaryRepo.findOne({
        where: { guid: item.guid },
        include: this.getIncludes(),
      });
      return {
        status: 201,
        data: createdItem,
        message: await this.i18n.translate('salary.createSuccess', { lang }),
      };
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, await this.i18n.translate('salary.createFailed', { lang }), error);
    }
  }



  async ensureCurrentMonthRow(employeeGuid: string, hireDate?: Date | null) {
    try {
      const employee = await this.employeeRepo.findByPk(employeeGuid, {
        attributes: ['guid', 'office_guid', 'is_active', 'createdAt'],
      });
      if (!employee?.office_guid || employee.is_active === false) return null;

      const hiredAt = hireDate ?? (employee as any).createdAt ?? new Date();
      const now = new Date();
      const month = monthOf(now);
      if (await this.isDuplicate(employee.guid, month)) return null;
      if (await this.hasLockedPeriod([{ month, office_guid: employee.office_guid }])) return null;

      const monthStarted = await this.salaryRepo.count({
        where: { month },
        include: [
          {
            model: Employee,
            as: 'employee',
            attributes: [],
            where: { office_guid: employee.office_guid },
            required: true,
          },
        ],
      });
      if (!monthStarted) return null;

      const previous = await this.salaryRepo.findOne({
        where: { employee_guid: employee.guid, month: { [Op.lt]: month } },
        attributes: [...CARRY_OVER_FIELDS, 'bonus_percent', 'bonus_currency'],
        order: [['month', 'DESC']],
        raw: true,
      });

      const hiredThisMonth = monthOf(new Date(hiredAt)) === month;
      const workDays = workDaysInMonth(month);
      const base = {
        base_salary: Number(previous?.base_salary || 0),
        card_amount: Number(previous?.card_amount || 0),
        work_days: workDays,
        worked_days: hiredThisMonth ? workDaysFrom(month, new Date(hiredAt).getDate()) : workDays,
        bonus_percent: previous?.bonus_percent ?? null,
        sales_amount: previous?.bonus_percent != null ? 0 : null,
        bonus_currency: toBonusCurrency(previous?.bonus_currency),
      };

      const created = await this.salaryRepo.create({
        month,
        employee_guid: employee.guid,
        ...base,
        ...this.normalize(base),
      } as any);
      this.logger.log(`Created ${month} salary row for employee ${employee.guid}`);
      return created;
    } catch (error: any) {
      this.logger.error(`Could not create the salary row: ${error?.message}`);
      return null;
    }
  }


  async generateMonth(dto: GenerateSalaryMonthDto, userPayload: any, lang: string = 'tk'): Promise<ServiceResult> {
    try {
      const scope = await this.resolveScope(userPayload);
      if (!this.hasAccess(scope)) return this.noOfficeError(lang);

      const officeGuid = scope.allOffices ? dto.office_guid : scope.officeGuid;
      const employeeWhere: any = { is_active: true };
      if (officeGuid) employeeWhere.office_guid = officeGuid;
      if (dto.employee_guids?.length) employeeWhere.guid = dto.employee_guids;

      const employees = await this.employeeRepo.findAll({
        where: employeeWhere,
        attributes: ['guid', 'office_guid'],
        order: [['index_number', 'ASC']],
        raw: true,
      });

      const periods = [...new Set(employees.map((e: any) => e.office_guid))].map((office_guid) => ({
        month: dto.month,
        office_guid,
      }));
      if (await this.hasLockedPeriod(periods)) return this.monthLockedError(lang);

      const employeeGuids = employees.map((e: any) => e.guid);
      const existing = await this.salaryRepo.findAll({
        where: { month: dto.month, employee_guid: employeeGuids },
        attributes: ['employee_guid'],
        raw: true,
      });
      const existingSet = new Set(existing.map((e: any) => e.employee_guid));
      const missing = employeeGuids.filter((g) => !existingSet.has(g));

      if (missing.length === 0) {
        return {
          status: 200,
          data: { created: 0, skipped: existingSet.size },
          message: await this.i18n.translate('salary.generateNothing', { lang }),
        };
      }
      const history = await this.salaryRepo.findAll({
        where: {
          employee_guid: missing,
          month: { [Op.lt]: dto.month, [Op.gte]: shiftMonth(dto.month, -12) },
        },
        attributes: ['employee_guid', 'month', ...CARRY_OVER_FIELDS, 'bonus_percent', 'bonus_currency'],
        order: [['month', 'DESC']],
        raw: true,
      });
      const latest = new Map<string, any>();
      history.forEach((h: any) => {
        if (!latest.has(h.employee_guid)) latest.set(h.employee_guid, h);
      });

      const workDays = workDaysInMonth(dto.month);
      const records = missing.map((employee_guid) => {
        const prev = latest.get(employee_guid) || {};
        const base = {
          base_salary: Number(prev.base_salary || 0),
          card_amount: Number(prev.card_amount || 0),
          work_days: workDays,
          worked_days: workDays,
          bonus_percent: prev.bonus_percent ?? null,
          sales_amount: prev.bonus_percent != null ? 0 : null,
          bonus_currency: toBonusCurrency(prev.bonus_currency),
        };
        return {
          month: dto.month,
          employee_guid,
          ...base,
          ...this.normalize(base),
          created_by_guid: scope.employeeGuid,
        };
      });

      await this.salaryRepo.bulkCreate(records as any[]);

      return {
        status: 201,
        data: { created: records.length, skipped: existingSet.size },
        message: await this.i18n.translate('salary.generateSuccess', { lang, args: { count: records.length } }),
      };
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, await this.i18n.translate('salary.generateFailed', { lang }), error);
    }
  }


  async getAllSalaries(
    userPayload: any,
    page: number = 1,
    limit: number = 20,
    filters?: SalaryFilters,
    includePrevious: boolean = false,
    lang: string = 'tk',
  ) {
    try {
      const currentPage = Math.max(1, Number(page) || 1);
      const currentLimit = Math.max(1, Number(limit) || 20);
      const offset = (currentPage - 1) * currentLimit;
      const scope = await this.resolveScope(userPayload);
      const message = await this.i18n.translate('salary.fetchSuccess', { lang });
      if (!this.hasAccess(scope)) return this.emptyList(currentPage, message);

      const { rows, count } = await this.salaryRepo.findAndCountAll({
        where: this.buildWhereConditions(scope, filters),
        include: this.getIncludes(),
        order: [['month', 'DESC'], ['index_number', 'ASC']],
        limit: currentLimit,
        offset,
      });
      return {
        status: 200,
        data: includePrevious ? await this.attachPrevious(rows) : rows,
        meta: {
          totalItems: count,
          totalPages: Math.ceil(count / currentLimit),
          currentPage,
        },
        message,
      };
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, await this.i18n.translate('salary.fetchFailed', { lang }), error);
    }
  }


  async getSummary(userPayload: any, filters?: SalaryFilters, lang: string = 'tk') {
    try {
      const scope = await this.resolveScope(userPayload);
      const data: Record<string, number> = { count: 0, bonus_usd: 0 };
      SUMMARY_FIELDS.forEach((f) => { data[f] = 0; });

      if (this.hasAccess(scope)) {
        const row: any = await this.salaryRepo.findOne({
          where: this.buildWhereConditions(scope, filters),
          include: [{ model: Employee, as: 'employee', attributes: [] }],
          attributes: [
            [fn('COUNT', col('Salary.guid')), 'count'],
            ...SUMMARY_FIELDS.map((f) =>
              f === 'bonus'
                ? ([BONUS_TMT_SUM, f] as [any, string])
                : ([fn('COALESCE', fn('SUM', col(`Salary.${f}`)), 0), f] as [any, string]),
            ),
            [BONUS_USD_SUM, 'bonus_usd'],
          ],
          raw: true,
        });
        data.count = Number(row?.count || 0);
        SUMMARY_FIELDS.forEach((f) => {
          data[f] = round2(Number(row?.[f] || 0));
        });
        data.bonus_usd = round2(Number(row?.bonus_usd || 0));
      }

      return {
        status: 200,
        data,
        message: await this.i18n.translate('salary.summarySuccess', { lang }),
      };
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, await this.i18n.translate('salary.summaryFailed', { lang }), error);
    }
  }


  async getMonthStatus(userPayload: any, month: string, officeFilter?: string, lang: string = 'tk') {
    try {
      const scope = await this.resolveScope(userPayload);
      const officeGuid = scope.allOffices ? officeFilter : scope.officeGuid;
      const status = officeGuid
        ? await this.salaryMonthRepo.findOne({
          where: { month, office_guid: officeGuid },
          include: [{ model: Employee, as: 'lockedBy', attributes: ['guid', 'fullName'] }],
        })
        : null;
      return {
        status: 200,
        data: status ?? {
          month,
          office_guid: officeGuid ?? null,
          is_locked: false,
          locked_at: null,
          lockedBy: null,
          salary_calc_guid: null,
          salary_usd_calc_guid: null,
          can_lock: Boolean(officeGuid),
        },
        message: await this.i18n.translate('salary.fetchSuccess', { lang }),
      };
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, await this.i18n.translate('salary.fetchFailed', { lang }), error);
    }
  }

  private async destroyMonthCalcRows(existing: SalaryMonth | null, transaction: Transaction) {
    const guids = [existing?.salary_calc_guid, existing?.salary_usd_calc_guid].filter(Boolean) as string[];
    if (guids.length === 0) return;
    await this.totalCalculationModel.destroy({ where: { guid: guids }, transaction });
  }


  async lockMonth(dto: LockSalaryMonthDto, userPayload: any, lang: string = 'tk') {
    try {
      const scope = await this.resolveScope(userPayload);
      const officeGuid = scope.allOffices ? dto.office_guid : scope.officeGuid;
      if (!officeGuid) return this.noOfficeError(lang);

      const { settled, salaryCalcGuid } = await this.salaryRepo.sequelize!.transaction(async (transaction) => {
        let settled = 0;
        let salaryCalcGuid: string | null = null;
        let salaryUsdCalcGuid: string | null = null;

        const existing = await this.salaryMonthRepo.findOne({
          where: { month: dto.month, office_guid: officeGuid },
          transaction,
        });

        if (dto.is_locked) {
          const employees = await this.employeeRepo.findAll({
            where: { office_guid: officeGuid, is_active: true },
            attributes: ['guid'],
            raw: true,
            transaction,
          });
          const employeeGuids = employees.map((e: any) => e.guid);
          if (employeeGuids.length > 0) {
            [settled] = await this.salaryRepo.update(
              {
                paid_amount: fn('GREATEST', col('payable_amount'), 0),
                paid_date: today(),
              } as any,
              {
                where: {
                  month: dto.month,
                  employee_guid: employeeGuids,
                  paid_date: null,
                } as any,
                transaction,
              },
            );
          }
          let totalAmount = 0;
          let usdBonusAmount = 0;
          if (employeeGuids.length > 0) {
            const summaryRow: any = await this.salaryRepo.findOne({
              where: {
                month: dto.month,
                employee_guid: employeeGuids,
              },
              attributes: [
                [fn('COALESCE', fn('SUM', col('total_amount')), 0), 'total_amount'],
                [BONUS_USD_SUM, 'bonus_usd'],
              ],
              raw: true,
              transaction,
            });
            totalAmount = round2(Number(summaryRow?.total_amount || 0));
            usdBonusAmount = round2(Number(summaryRow?.bonus_usd || 0));
          }

          await this.destroyMonthCalcRows(existing, transaction);

          const calcRow = (net_price: number, net_price_usd: number, description: string) =>
            this.totalCalculationModel.create(
              {
                category_guid: SYSTEM_CATEGORIES.SALARY,
                net_price,
                net_price_usd,
                sale_price: 0,
                sale_price_usd: 0,
                currency: 'TMT',
                profit: 0,
                profit_usd: 0,
                credit_price: 0,
                credit_usd: 0,
                datetime: new Date(),
                receiver_opr_guid: scope.employeeGuid,
                office_guid: officeGuid,
                is_manual: false,
                source: 'PROJECT',
                description,
              } as any,
              { transaction },
            );

          const createdCalc = await calcRow(totalAmount, usdBonusAmount, `${dto.month} aýlygy`);
          salaryCalcGuid = createdCalc.guid;
          salaryUsdCalcGuid = null;
        } else {
          await this.destroyMonthCalcRows(existing, transaction);
          salaryCalcGuid = null;
          salaryUsdCalcGuid = null;
        }

        const values = {
          is_locked: dto.is_locked,
          locked_at: dto.is_locked ? new Date() : null,
          locked_by_guid: dto.is_locked ? scope.employeeGuid : null,
          salary_calc_guid: salaryCalcGuid,
          salary_usd_calc_guid: salaryUsdCalcGuid,
        };

        if (existing) {
          await existing.update(values as any, { transaction });
        } else {
          await this.salaryMonthRepo.create(
            { month: dto.month, office_guid: officeGuid, ...values } as any,
            { transaction },
          );
        }

        return { settled, salaryCalcGuid };
      });

      const status = await this.salaryMonthRepo.findOne({
        where: { month: dto.month, office_guid: officeGuid },
        include: [{ model: Employee, as: 'lockedBy', attributes: ['guid', 'fullName'] }],
      });
      const messageKey = !dto.is_locked
        ? 'salary.unlockSuccess'
        : settled > 0
          ? 'salary.lockPaidSuccess'
          : 'salary.lockSuccess';
      return {
        status: 200,
        data: status ? { ...status.get({ plain: true }), paid_count: settled } : status,
        message: await this.i18n.translate(messageKey, { lang, args: { count: settled } }),
      };
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, await this.i18n.translate('salary.lockFailed', { lang }), error);
    }
  }


  async updateSalary(dto: UpdateSalaryDto, userPayload: any, lang: string = 'tk'): Promise<ServiceResult> {
    try {
      const scope = await this.resolveScope(userPayload);
      if (!this.hasAccess(scope)) return this.noOfficeError(lang);

      const item = await this.salaryRepo.findOne({
        where: { guid: dto.guid },
        include: [{ model: Employee, as: 'employee', attributes: ['guid', 'office_guid', 'is_active'] }],
      });
      if (!item) {
        return errorResponse(HttpStatuses.NOT_FOUND, await this.i18n.translate('salary.notFound', { lang }));
      }
      if (!this.employeeInScope(item.employee, scope)) return this.outOfScopeError(lang);

      const { guid, ...updateData } = dto;
      const { employee: _employee, ...current } = item.get({ plain: true }) as any;
      const merged: any = { ...current, ...updateData };

      let targetEmployee = item.employee;
      if (updateData.employee_guid && updateData.employee_guid !== item.employee_guid) {
        targetEmployee = (await this.employeeRepo.findByPk(updateData.employee_guid, {
          attributes: ['guid', 'office_guid', 'is_active'],
        })) as Employee;
        if (!targetEmployee) {
          return errorResponse(HttpStatuses.NOT_FOUND, await this.i18n.translate('salary.employeeNotFound', { lang }));
        }
        if (!this.employeeInScope(targetEmployee, scope)) return this.outOfScopeError(lang);
      }

      if (await this.hasLockedPeriod([
        { month: item.month, office_guid: item.employee?.office_guid },
        { month: merged.month, office_guid: targetEmployee?.office_guid },
      ])) {
        return this.monthLockedError(lang);
      }
      if (Number(merged.worked_days) > Number(merged.work_days)) {
        return errorResponse(HttpStatuses.BAD_REQUEST, await this.i18n.translate('salary.workedDaysExceed', { lang }));
      }
      if (
        (updateData.employee_guid || updateData.month) &&
        (await this.isDuplicate(merged.employee_guid, merged.month, guid))
      ) {
        return errorResponse(HttpStatuses.CONFLICT, await this.i18n.translate('salary.alreadyExists', { lang }));
      }

      await item.update({
        ...updateData,
        ...this.normalize(merged),
        ...(updateData.paid_date !== undefined && { paid_date: updateData.paid_date || null }),
      } as any);

      const updated = await this.salaryRepo.findOne({
        where: { guid },
        include: this.getIncludes(),
      });
      return {
        status: 200,
        data: updated,
        message: await this.i18n.translate('salary.updateSuccess', { lang }),
      };
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, await this.i18n.translate('salary.updateFailed', { lang }), error);
    }
  }


  async markPaid(dto: MarkSalaryPaidDto, userPayload: any, lang: string = 'tk'): Promise<ServiceResult> {
    try {
      const scope = await this.resolveScope(userPayload);
      if (!this.hasAccess(scope)) return this.noOfficeError(lang);

      const { rows, inScope } = await this.loadScopedRows(dto.guids, scope);
      if (rows.length === 0) {
        return errorResponse(HttpStatuses.NOT_FOUND, await this.i18n.translate('salary.notFound', { lang }));
      }
      if (!inScope) return this.outOfScopeError(lang);
      if (await this.hasLockedPeriod(rows.map((r) => ({ month: r.month, office_guid: r.employee?.office_guid })))) {
        return this.monthLockedError(lang);
      }

      const guids = rows.map((r) => r.guid);
      await this.salaryRepo.update(
        {
          paid_amount: fn('GREATEST', col('payable_amount'), 0),
          paid_date: dto.paid_date || today(),
        } as any,
        { where: { guid: guids } },
      );

      const updated = await this.salaryRepo.findAll({
        where: { guid: guids },
        include: this.getIncludes(),
      });
      return {
        status: 200,
        data: updated,
        message: await this.i18n.translate('salary.markPaidSuccess', { lang, args: { count: updated.length } }),
      };
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, await this.i18n.translate('salary.markPaidFailed', { lang }), error);
    }
  }


  async deleteSalary(guid: string | string[], userPayload: any, lang: string = 'tk'): Promise<ServiceResult> {
    try {
      const scope = await this.resolveScope(userPayload);
      if (!this.hasAccess(scope)) return this.noOfficeError(lang);

      const { rows, inScope } = await this.loadScopedRows(Array.isArray(guid) ? guid : [guid], scope);
      if (rows.length === 0) {
        return errorResponse(HttpStatuses.NOT_FOUND, await this.i18n.translate('salary.notFound', { lang }));
      }
      if (!inScope) return this.outOfScopeError(lang);
      if (await this.hasLockedPeriod(rows.map((r) => ({ month: r.month, office_guid: r.employee?.office_guid })))) {
        return this.monthLockedError(lang);
      }

      await this.salaryRepo.destroy({ where: { guid: rows.map((r) => r.guid) } });
      return {
        status: 200,
        data: { guid },
        message: await this.i18n.translate('salary.deleteSuccess', { lang }),
      };
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, await this.i18n.translate('salary.deleteFailed', { lang }), error);
    }
  }
}
