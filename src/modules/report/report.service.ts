import { Injectable } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { InjectModel } from '@nestjs/sequelize';
import { Report } from './entities/report.entity';
import { ReportShare } from '../report_share/entities/report_share.entity';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { errorResponse, successResponse } from '../../helpers/responseFunctions';
import { HttpStatuses } from '../../helpers/httpStatuses.enum';

@Injectable()
export class ReportService {
  constructor(
    @InjectModel(Report) private readonly reportRepository: typeof Report,
    @InjectModel(ReportShare) private readonly reportShareRepository: typeof ReportShare,
    private readonly i18n: I18nService,
  ) { }

  async getTotalReportCount() {
    const totalLetterSum = await this.reportRepository.sum('total_letter') || 0;
    const totalCountSum = await this.reportShareRepository.sum('total_count') || 0;
    return totalLetterSum - totalCountSum;
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
      const pageNum = Number(page) || 1;
      const limitNum = Number(limit) || 10;
      const offset = (pageNum - 1) * limitNum;

      const whereClause: any = {};

      const { rows, count } = await this.reportRepository.findAndCountAll({
        where: whereClause,
        limit: limitNum,
        offset,
        order: [['createdAt', 'DESC']],
      });

      const total_report_count = await this.getTotalReportCount();

      return {
        status: 200,
        data: rows,
        meta: {
          totalItems: count,
          itemCount: rows.length,
          itemsPerPage: limitNum,
          totalPages: Math.ceil(count / limitNum),
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
