import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { I18nService } from 'nestjs-i18n';
import { Op, Sequelize } from 'sequelize';
import { InboundExpected } from './entities/inbound-expected.entity';
import { InboundArrival } from './entities/inbound-arrival.entity';
import { InboundInvitation } from './entities/inbound-invitation.entity';
import { CreateInboundExpectedDto, UpdateInboundExpectedDto } from './dto/inbound-expected.dto';
import { CreateInboundArrivalDto, UpdateInboundArrivalDto } from './dto/inbound-arrival.dto';
import { CreateInboundInvitationDto, UpdateInboundInvitationDto } from './dto/inbound-invitation.dto';
import { errorResponse } from '../../helpers/responseFunctions';
import { HttpStatuses } from '../../helpers/httpStatuses.enum';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_PAGE_SIZE = 200;

export type InboundReportFilters = { search?: string; start_date?: string; end_date?: string };

const EXPECTED = { dateField: 'start_date', searchFields: ['country', 'route', 'transport'] };
const ARRIVAL = {
  dateField: 'entry_date',
  searchFields: [
    'full_name', 'passport_number', 'citizenship', 'invitation_number', 'voucher_number',
    'entry_border', 'exit_border',
  ],
};
const INVITATION = { dateField: 'report_month', searchFields: ['country'] };

const day = (value?: string | null) => (value ? String(value).slice(0, 10) : value);
const clean = (value?: string) => (typeof value === 'string' ? value.trim() : value);
const escapeLike = (value: string) => value.replace(/[\\%_]/g, '\\$&');
const datesInOrder = (startKey: string, endKey: string) => (row: Record<string, any>) =>
  !row[startKey] || !row[endKey] || String(row[endKey]) >= String(row[startKey]);
const EXPECTED_DATES = datesInOrder('start_date', 'end_date');
const ARRIVAL_DATES = datesInOrder('entry_date', 'exit_date');

@Injectable()
export class InboundReportService implements OnModuleInit {
  constructor(
    @InjectModel(InboundExpected) private expectedRepo: typeof InboundExpected,
    @InjectModel(InboundArrival) private arrivalRepo: typeof InboundArrival,
    @InjectModel(InboundInvitation) private invitationRepo: typeof InboundInvitation,
    private readonly i18n: I18nService,
  ) { }

  async onModuleInit() {
    try {
      await this.invitationRepo.sequelize?.query(
        `ALTER TABLE IF EXISTS "tbl_inbound_invitations" ADD COLUMN IF NOT EXISTS "not_arrived_count" INTEGER NOT NULL DEFAULT 0;`,
      );
    } catch (error) {
      console.error("InboundReportService: could not add not_arrived_count", error);
    }
  }

  private msg(key: string, lang: string) {
    return this.i18n.t(`inbound_report.${key}`, { lang });
  }

  private buildWhere(config: { dateField: string; searchFields: string[] }, filters?: InboundReportFilters) {
    const where: any = {};
    if (!filters) return where;

    const search = filters.search?.trim();
    if (search) {
      const pattern = `%${escapeLike(search)}%`;
      where[Op.or] = config.searchFields.map((field) => ({ [field]: { [Op.iLike]: pattern } }));
    }

    const start = filters.start_date?.slice(0, 10);
    const end = filters.end_date?.slice(0, 10);
    const range: any = {};
    if (start && DATE_RE.test(start)) range[Op.gte] = start;
    if (end && DATE_RE.test(end)) range[Op.lte] = end;
    if (Object.getOwnPropertySymbols(range).length) where[config.dateField] = range;

    return where;
  }

  private async createRow(
    repo: any,
    data: Record<string, any>,
    lang: string,
    isValid?: (row: Record<string, any>) => boolean,
  ) {
    try {
      if (isValid && !isValid(data)) {
        return errorResponse(HttpStatuses.BAD_REQUEST, this.msg('dateOrder', lang));
      }
      const item = await repo.create(data);
      return { status: 201, data: item, message: this.msg('created', lang) };
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.msg('createFailed', lang), error);
    }
  }

  private async listRows(
    repo: any,
    config: { dateField: string; searchFields: string[] },
    page: number,
    limit: number,
    filters: InboundReportFilters,
    lang: string,
  ) {
    try {
      const currentPage = Math.max(1, Number(page) || 1);
      const currentLimit = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(limit) || 20));

      const { rows, count } = await repo.findAndCountAll({
        where: this.buildWhere(config, filters),
        order: [[config.dateField, 'DESC'], ['index_number', 'DESC']],
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
          itemsPerPage: currentLimit,
        },
        message: this.msg('listFetched', lang),
      };
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.msg('fetchFailed', lang), error);
    }
  }

  private async updateRow(
    repo: any,
    guid: string,
    data: Record<string, any>,
    lang: string,
    isValid?: (row: Record<string, any>) => boolean,
  ) {
    try {
      const item = await repo.findByPk(guid);
      if (!item) {
        return errorResponse(HttpStatuses.NOT_FOUND, this.msg('notFound', lang));
      }
      if (isValid && !isValid({ ...item.get({ plain: true }), ...data })) {
        return errorResponse(HttpStatuses.BAD_REQUEST, this.msg('dateOrder', lang));
      }
      await item.update(data);
      return { status: 200, data: item, message: this.msg('updated', lang) };
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.msg('updateFailed', lang), error);
    }
  }

  private async deleteRow(repo: any, guid: string, lang: string) {
    try {
      const item = await repo.findByPk(guid);
      if (!item) {
        return errorResponse(HttpStatuses.NOT_FOUND, this.msg('notFound', lang));
      }
      await item.destroy();
      return { status: 200, data: { guid }, message: this.msg('deleted', lang) };
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.msg('deleteFailed', lang), error);
    }
  }

  private expectedData(dto: Partial<CreateInboundExpectedDto>) {
    const data: Record<string, any> = { ...dto };
    if (dto.country !== undefined) data.country = clean(dto.country);
    if (dto.start_date !== undefined) data.start_date = day(dto.start_date);
    if (dto.end_date !== undefined) data.end_date = day(dto.end_date);
    return data;
  }

  private arrivalData(dto: Partial<CreateInboundArrivalDto>) {
    const data: Record<string, any> = { ...dto };
    if (dto.full_name !== undefined) data.full_name = clean(dto.full_name);
    if (dto.passport_number !== undefined) data.passport_number = clean(dto.passport_number);
    if (dto.citizenship !== undefined) data.citizenship = clean(dto.citizenship);
    if (dto.birth_date !== undefined) data.birth_date = day(dto.birth_date);
    if (dto.entry_date !== undefined) data.entry_date = day(dto.entry_date);
    if (dto.exit_date !== undefined) data.exit_date = day(dto.exit_date);
    return data;
  }

  private invitationData(dto: Partial<CreateInboundInvitationDto>) {
    const data: Record<string, any> = { ...dto };
    if (dto.country !== undefined) data.country = clean(dto.country);
    if (dto.report_month !== undefined) data.report_month = `${String(dto.report_month).slice(0, 7)}-01`;
    return data;
  }


  addExpected(dto: CreateInboundExpectedDto, lang: string) {
    return this.createRow(this.expectedRepo, this.expectedData(dto), lang, EXPECTED_DATES);
  }

  getAllExpected(page: number, limit: number, filters: InboundReportFilters, lang: string) {
    return this.listRows(this.expectedRepo, EXPECTED, page, limit, filters, lang);
  }

  updateExpected({ guid, ...dto }: UpdateInboundExpectedDto, lang: string) {
    return this.updateRow(this.expectedRepo, guid, this.expectedData(dto), lang, EXPECTED_DATES);
  }

  deleteExpected(guid: string, lang: string) {
    return this.deleteRow(this.expectedRepo, guid, lang);
  }


  addArrival(dto: CreateInboundArrivalDto, lang: string) {
    return this.createRow(this.arrivalRepo, this.arrivalData(dto), lang, ARRIVAL_DATES);
  }

  getAllArrivals(page: number, limit: number, filters: InboundReportFilters, lang: string) {
    return this.listRows(this.arrivalRepo, ARRIVAL, page, limit, filters, lang);
  }

  updateArrival({ guid, ...dto }: UpdateInboundArrivalDto, lang: string) {
    return this.updateRow(this.arrivalRepo, guid, this.arrivalData(dto), lang, ARRIVAL_DATES);
  }

  deleteArrival(guid: string, lang: string) {
    return this.deleteRow(this.arrivalRepo, guid, lang);
  }


  addInvitation(dto: CreateInboundInvitationDto, lang: string) {
    return this.createRow(this.invitationRepo, this.invitationData(dto), lang);
  }

  getAllInvitations(page: number, limit: number, filters: InboundReportFilters, lang: string) {
    return this.listRows(this.invitationRepo, INVITATION, page, limit, filters, lang);
  }

  updateInvitation({ guid, ...dto }: UpdateInboundInvitationDto, lang: string) {
    return this.updateRow(this.invitationRepo, guid, this.invitationData(dto), lang);
  }

  deleteInvitation(guid: string, lang: string) {
    return this.deleteRow(this.invitationRepo, guid, lang);
  }

  async getSummary(filters: InboundReportFilters, lang: string = 'tk') {
    try {
      const sum = (field: string) => Sequelize.fn('COALESCE', Sequelize.fn('SUM', Sequelize.col(field)), 0);

      const [expected, countries, invitations] = await Promise.all([
        this.expectedRepo.findOne({
          attributes: [
            [Sequelize.fn('COUNT', Sequelize.col('guid')), 'groups'],
            [sum('tourists_count'), 'tourists'],
          ],
          where: this.buildWhere(EXPECTED, filters),
          raw: true,
        }) as Promise<any>,
        this.arrivalRepo.findAll({
          attributes: ['citizenship', [Sequelize.fn('COUNT', Sequelize.col('guid')), 'count']],
          where: this.buildWhere(ARRIVAL, filters),
          group: ['citizenship'],
          raw: true,
        }) as Promise<any[]>,
        this.invitationRepo.findOne({
          attributes: [
            [sum('granted_count'), 'granted'],
            [sum('refused_count'), 'refused'],
            [sum('pending_count'), 'pending'],
            [sum('not_arrived_count'), 'not_arrived'],
          ],
          where: this.buildWhere(INVITATION, filters),
          raw: true,
        }) as Promise<any>,
      ]);

      const byCountry = countries
        .map((row) => ({ country: row.citizenship, count: Number(row.count) || 0 }))
        .sort((a, b) => b.count - a.count || String(a.country).localeCompare(String(b.country)));
      const granted = Number(invitations?.granted) || 0;
      const refused = Number(invitations?.refused) || 0;
      const pending = Number(invitations?.pending) || 0;
      const notArrived = Number(invitations?.not_arrived) || 0;

      return {
        status: 200,
        data: {
          expected: {
            groups: Number(expected?.groups) || 0,
            tourists: Number(expected?.tourists) || 0,
          },
          arrivals: {
            total: byCountry.reduce((acc, row) => acc + row.count, 0),
            countries: byCountry,
          },
          invitations: { submitted: granted + refused + pending, granted, refused, pending, not_arrived: notArrived },
        },
        message: this.msg('summaryFetched', lang),
      };
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.msg('fetchFailed', lang), error);
    }
  }
}
