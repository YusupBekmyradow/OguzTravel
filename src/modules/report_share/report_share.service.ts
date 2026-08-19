import { Injectable } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { InjectModel } from '@nestjs/sequelize';
import { CreateReportShareDto } from './dto/create-report_share.dto';
import { UpdateReportShareDto } from './dto/update-report_share.dto';
import { ReportShare } from './entities/report_share.entity';
import { Report } from '../report/entities/report.entity';
import { Employee } from '../employee/entities/employee.entity';
import { errorResponse, successResponse } from '../../helpers/responseFunctions';
import { HttpStatuses } from '../../helpers/httpStatuses.enum';
import { QueryTypes } from 'sequelize';

@Injectable()
export class ReportShareService {
  constructor(
    @InjectModel(ReportShare)
    private readonly reportShareRepository: typeof ReportShare,
    @InjectModel(Report)
    private readonly reportRepository: typeof Report,
    private readonly i18n: I18nService,
  ) { }

  async getTotalReportCount(): Promise<number> {
    const [res]: any[] = await this.reportShareRepository.sequelize!.query(`
      SELECT (
        COALESCE((SELECT SUM(total_letter) FROM tbl_reports), 0) -
        COALESCE((SELECT SUM(total_count) FROM tbl_report_share), 0)
      )::int AS total_report_count
    `, { type: QueryTypes.SELECT });
    return Number(res?.total_report_count || 0);
  }

  async addReportShare(createReportShareDto: CreateReportShareDto, lang: string) {
    try {
      const reportShare = await this.reportShareRepository.create({
        ...createReportShareDto,
      } as any);

      const [newReportShare, total_report_count] = await Promise.all([
        this.reportShareRepository.findOne({
          where: { guid: reportShare.guid },
          include: [
            { model: Employee, as: 'reportAS_operator', attributes: ['guid', 'fullName'] },
            { model: Employee, as: 'reportRE_operator', attributes: ['guid', 'fullName'] },
          ],
        }),
        this.getTotalReportCount(),
      ]);

      return {
        ...successResponse(
          HttpStatuses.CREATED,
          newReportShare,
          this.i18n.t('report_share.created', { lang }),
        ),
        total_report_count,
      };
    } catch (error: any) {
      return errorResponse(
        HttpStatuses.INTERNAL_SERVER_ERROR,
        this.i18n.t('report_share.createFailed', { lang }),
        error,
      );
    }
  }

  async getAllReportShares(
    lang: string = 'tk',
    filters?: {
      page?: number;
      limit?: number;
      search?: string;
      datetime?: string | Date;
      status?: number;
      assignment_opr_guid?: string;
      receiver_opr_guid?: string;
    },
  ) {
    try {
      const currentPage = Math.max(1, Number(filters?.page || 1));
      const currentLimit = Math.max(1, Number(filters?.limit || 10));
      const offset = (currentPage - 1) * currentLimit;

      const replacements: any = {
        limit: currentLimit,
        offset,
        search: filters?.search?.trim() ? `%${filters.search.trim()}%` : null,
        datetime: filters?.datetime
          ? (String(filters.datetime).includes('T') ? String(filters.datetime).split('T')[0] : String(filters.datetime).trim())
          : null,
        status: filters?.status !== undefined && filters?.status !== null ? Number(filters.status) : null,
        assignment_opr_guid: filters?.assignment_opr_guid || null,
        receiver_opr_guid: filters?.receiver_opr_guid || null,
      };

      const sqlQuery = `
        SELECT
          rs.guid,
          rs.index_number,
          rs.datetime,
          rs.total_count,
          rs.assignment_opr_guid,
          rs.receiver_opr_guid,
          rs.start_yh_number,
          rs.end_yh_number,
          rs.status,
          rs.note,
          rs."createdAt",
          rs."updatedAt",
          CASE 
            WHEN as_op.guid IS NOT NULL THEN JSON_BUILD_OBJECT('guid', as_op.guid, 'fullName', as_op."fullName")
            ELSE NULL 
          END AS "reportAS_operator",
          CASE 
            WHEN re_op.guid IS NOT NULL THEN JSON_BUILD_OBJECT('guid', re_op.guid, 'fullName', re_op."fullName")
            ELSE NULL 
          END AS "reportRE_operator",
          COUNT(*) OVER() AS "totalCount"
        FROM tbl_report_share rs
        LEFT JOIN tbl_employees as_op ON as_op.guid = rs.assignment_opr_guid
        LEFT JOIN tbl_employees re_op ON re_op.guid = rs.receiver_opr_guid
        WHERE
          (:search::text IS NULL OR (
            rs.note ILIKE :search
            OR rs.start_yh_number::text ILIKE :search
            OR rs.end_yh_number::text ILIKE :search
          ))
          AND (:datetime::date IS NULL OR rs.datetime::date = :datetime::date)
          AND (:status::integer IS NULL OR rs.status = :status::integer)
          AND (:assignment_opr_guid::uuid IS NULL OR rs.assignment_opr_guid = :assignment_opr_guid::uuid)
          AND (:receiver_opr_guid::uuid IS NULL OR rs.receiver_opr_guid = :receiver_opr_guid::uuid)
        ORDER BY rs."createdAt" DESC
        LIMIT :limit OFFSET :offset
      `;

      const [rows, total_report_count]: [any[], number] = await Promise.all([
        this.reportShareRepository.sequelize!.query(sqlQuery, {
          replacements,
          type: QueryTypes.SELECT,
        }),
        this.getTotalReportCount(),
      ]);

      const totalItems = rows.length > 0 ? Number(rows[0].totalCount) : 0;
      const data = rows.map(({ totalCount, ...rest }) => rest);

      return {
        status: 200,
        data,
        meta: {
          totalItems,
          itemCount: data.length,
          itemsPerPage: currentLimit,
          totalPages: Math.ceil(totalItems / currentLimit),
          currentPage: currentPage,
        },
        message: 'Report share list retrieved successfully',
        total_report_count,
      };
    } catch (error: any) {
      return errorResponse(
        HttpStatuses.INTERNAL_SERVER_ERROR,
        'Failed to retrieve report share list. Please try again later.',
        error,
      );
    }
  }

  async updateReportShare(updateReportShareDto: UpdateReportShareDto, lang: string) {
    try {
      const { guid, ...updateData } = updateReportShareDto;

      const existingReportShare = await this.reportShareRepository.findByPk(guid);
      if (!existingReportShare) {
        return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('report_share.notFound', { lang }));
      }

      await existingReportShare.update(updateData as any);

      const [updatedReportShare, total_report_count] = await Promise.all([
        this.reportShareRepository.findOne({
          where: { guid },
          include: [
            { model: Employee, as: 'reportAS_operator', attributes: ['guid', 'fullName'] },
            { model: Employee, as: 'reportRE_operator', attributes: ['guid', 'fullName'] },
          ],
        }),
        this.getTotalReportCount(),
      ]);

      return {
        ...successResponse(
          HttpStatuses.OK,
          updatedReportShare,
          this.i18n.t('report_share.updated', { lang }),
        ),
        total_report_count,
      };
    } catch (error: any) {
      return errorResponse(
        HttpStatuses.INTERNAL_SERVER_ERROR,
        this.i18n.t('report_share.updateFailed', { lang }),
        error,
      );
    }
  }

  async deleteReportShare(guid: string, lang: string) {
    try {
      const reportShare = await this.reportShareRepository.findByPk(guid);
      if (!reportShare) {
        return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('report_share.notFound', { lang }));
      }

      await reportShare.destroy();

      const total_report_count = await this.getTotalReportCount();

      return {
        ...successResponse(
          HttpStatuses.OK,
          null,
          this.i18n.t('report_share.deleted', { lang }),
        ),
        total_report_count,
      };
    } catch (error: any) {
      return errorResponse(
        HttpStatuses.INTERNAL_SERVER_ERROR,
        this.i18n.t('report_share.deleteFailed', { lang }),
        error,
      );
    }
  }
}
