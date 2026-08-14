import { Injectable } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { InjectModel } from '@nestjs/sequelize';
import { Report } from './entities/report.entity';
import { ReportShare } from '../report_share/entities/report_share.entity';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { errorResponse, successResponse } from '../../helpers/responseFunctions';
import { HttpStatuses } from '../../helpers/httpStatuses.enum';
import { QueryTypes } from 'sequelize';

@Injectable()
export class ReportService {
  constructor(
    @InjectModel(Report) private readonly reportRepository: typeof Report,
    @InjectModel(ReportShare) private readonly reportShareRepository: typeof ReportShare,
    private readonly i18n: I18nService,
  ) { }

  async getTotalReportCount() {
    const result: any[] = await this.reportRepository.sequelize!.query(
      `SELECT
        COALESCE((SELECT SUM(total_letter) FROM tbl_reports), 0) -
        COALESCE((SELECT SUM(total_count) FROM tbl_report_share), 0) AS total`,
      { type: QueryTypes.SELECT },
    );
    return Number(result[0]?.total || 0);
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


  async getAllReports(page: number = 1, limit: number = 10, lang: string = 'tk') {
    try {
      const pageNum = Math.max(1, Number(page) || 1);
      const limitNum = Math.max(1, Math.min(100, Number(limit) || 10));
      const offset = (pageNum - 1) * limitNum;
      const sequelize = this.reportRepository.sequelize!;

      const [countResult, rows, totalResult]: [any[], any[], any[]] = await Promise.all([
        sequelize.query(
          `SELECT COUNT(*)::int AS total FROM tbl_reports`,
          { type: QueryTypes.SELECT },
        ),
        sequelize.query(
          `SELECT guid, index_number, name, start_yh_number, end_yh_number, total_letter, note, "createdAt", "updatedAt"
           FROM tbl_reports
           ORDER BY "createdAt" DESC
           LIMIT :limit OFFSET :offset`,
          { replacements: { limit: limitNum, offset }, type: QueryTypes.SELECT },
        ),
        sequelize.query(
          `SELECT
            COALESCE((SELECT SUM(total_letter) FROM tbl_reports), 0) -
            COALESCE((SELECT SUM(total_count) FROM tbl_report_share), 0) AS total`,
          { type: QueryTypes.SELECT },
        ),
      ]);

      const total = Number(countResult[0]?.total || 0);
      const total_report_count = Number(totalResult[0]?.total || 0);

      return {
        status: 200,
        data: rows,
        meta: {
          totalItems: total,
          itemCount: rows.length,
          itemsPerPage: limitNum,
          totalPages: Math.ceil(total / limitNum),
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

      const updatedReport = await this.reportRepository.findOne({
        where: { guid },
      });

      const total_report_count = await this.getTotalReportCount();

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
