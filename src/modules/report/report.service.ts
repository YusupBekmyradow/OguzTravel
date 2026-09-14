import { Injectable } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { InjectModel } from '@nestjs/sequelize';
import { Report } from './entities/report.entity';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { errorResponse, successResponse } from '../../helpers/responseFunctions';
import { HttpStatuses } from '../../helpers/httpStatuses.enum';
import { QueryTypes } from 'sequelize';

@Injectable()
export class ReportService {
  constructor(
    @InjectModel(Report) private readonly reportRepository: typeof Report,
    private readonly i18n: I18nService,
  ) { }

  async getTotalReportCount(): Promise<number> {
    const [result]: any[] = await this.reportRepository.sequelize!.query(
      `SELECT COALESCE((SELECT SUM(total_letter) FROM tbl_reports), 0)::int AS total`,
      { type: QueryTypes.SELECT },
    );
    return Number(result?.total || 0);
  }

  async addReport(createReportDto: CreateReportDto, lang: string = 'tk') {
    try {
      const report = await this.reportRepository.create({
        ...createReportDto,
      } as any);
      const total_report_count = await this.getTotalReportCount();

      return {
        ...successResponse(
          HttpStatuses.CREATED,
          report,
          this.i18n.t('report.created', { lang }),
        ),
        total_report_count,
      };
    } catch (error: any) {
      return errorResponse(
        HttpStatuses.INTERNAL_SERVER_ERROR,
        this.i18n.t('report.createFailed', { lang }),
        error,
      );
    }
  }

  async getAllReports(
    page: number = 1,
    limit: number = 10,
    search?: string,
    lang: string = 'tk',
  ) {
    try {
      const pageNum = Math.max(1, Number(page) || 1);
      const limitNum = Math.max(1, Math.min(100, Number(limit) || 10));
      const offset = (pageNum - 1) * limitNum;

      const replacements: any = {
        limit: limitNum,
        offset,
        search: search?.trim() ? `%${search.trim()}%` : null,
      };

      const sqlQuery = `
        SELECT 
          guid,
          index_number,
          name,
          start_yh_number,
          end_yh_number,
          total_letter,
          note,
          "createdAt",
          "updatedAt",
          COUNT(*) OVER() AS "totalCount"
        FROM tbl_reports
        WHERE (:search::text IS NULL OR (
          name ILIKE :search
          OR start_yh_number::text ILIKE :search
          OR end_yh_number::text ILIKE :search
          OR total_letter::text ILIKE :search
          OR note ILIKE :search
          OR "createdAt"::text ILIKE :search
        ))
        ORDER BY "createdAt" DESC
        LIMIT :limit OFFSET :offset
      `;

      const [rows, total_report_count]: [any[], number] = await Promise.all([
        this.reportRepository.sequelize!.query(sqlQuery, {
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
          itemsPerPage: limitNum,
          totalPages: Math.ceil(totalItems / limitNum),
          currentPage: pageNum,
        },
        message: this.i18n.t('report.listFetched', { lang }),
        total_report_count,
      };
    } catch (error: any) {
      return errorResponse(
        HttpStatuses.INTERNAL_SERVER_ERROR,
        this.i18n.t('report.fetchFailed', { lang }),
        error,
      );
    }
  }

  async updateReport(updateReportDto: UpdateReportDto, lang: string = 'tk') {
    try {
      const { guid, ...updateData } = updateReportDto;
      const report = await this.reportRepository.findOne({ where: { guid } });
      if (!report) {
        return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('report.notFound', { lang }));
      }

      await this.reportRepository.update(updateData as any, {
        where: { guid },
      });

      const [updatedReport, total_report_count] = await Promise.all([
        this.reportRepository.findOne({ where: { guid } }),
        this.getTotalReportCount(),
      ]);

      return {
        ...successResponse(
          HttpStatuses.OK,
          updatedReport,
          this.i18n.t('report.updated', { lang }),
        ),
        total_report_count,
      };
    } catch (error: any) {
      return errorResponse(
        HttpStatuses.INTERNAL_SERVER_ERROR,
        this.i18n.t('report.updateFailed', { lang }),
        error,
      );
    }
  }

  async deleteReport(guid: string, lang: string = 'tk') {
    try {
      const deletedCount = await this.reportRepository.destroy({
        where: { guid },
      });

      if (deletedCount === 0) {
        return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('report.notFound', { lang }));
      }

      const total_report_count = await this.getTotalReportCount();

      return {
        ...successResponse(
          HttpStatuses.OK,
          null,
          this.i18n.t('report.deleted', { lang }),
        ),
        total_report_count,
      };
    } catch (error: any) {
      return errorResponse(
        HttpStatuses.INTERNAL_SERVER_ERROR,
        this.i18n.t('report.deleteFailed', { lang }),
        error,
      );
    }
  }
}
