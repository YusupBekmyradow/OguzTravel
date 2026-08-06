import { Injectable } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { InjectModel } from '@nestjs/sequelize';
import { Report } from './entities/report.entity';
import { ReportShare } from '../report_share/entities/report_share.entity';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { errorResponse, successResponse } from '../../helpers/responseFunctions';
import { HttpStatuses } from '../../helpers/httpStatuses.enum';
import { Op } from 'sequelize';

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

  async addReport(createReportDto: CreateReportDto) {
    try {
      const report = await this.reportRepository.create({
        ...createReportDto,
      } as any);
      const total_report_count = await this.getTotalReportCount();

      return {
        ...successResponse(
          HttpStatuses.CREATED,
          report,
          'Report has been created successfully',
        ),
        total_report_count,
      };
    } catch (error: any) {
      return errorResponse(
        HttpStatuses.INTERNAL_SERVER_ERROR,
        'Failed to create the report. Please try again later.',
        error,
      );
    }
  }

  async getAllReports(page: number = 1, limit: number = 10) {
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
        message: 'Report records retrieved successfully',
        total_report_count,
      };
    } catch (error: any) {
      return errorResponse(
        HttpStatuses.INTERNAL_SERVER_ERROR,
        'Failed to retrieve report records. Please try again later.',
        error,
      );
    }
  }

  async updateReport(updateReportDto: UpdateReportDto) {
    try {
      const { guid, ...updateData } = updateReportDto;
      const report = await this.reportRepository.findOne({ where: { guid } });
      if (!report) {
        return errorResponse(HttpStatuses.NOT_FOUND, 'No report found with the provided ID');
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
          'Report has been updated successfully',
        ),
        total_report_count,
      };
    } catch (error: any) {
      return errorResponse(
        HttpStatuses.INTERNAL_SERVER_ERROR,
        'Failed to update the report. Please try again later.',
        error,
      );
    }
  }

  async deleteReport(guid: string) {
    try {
      const deletedCount = await this.reportRepository.destroy({
        where: { guid },
      });

      if (deletedCount === 0) {
        return errorResponse(HttpStatuses.NOT_FOUND, 'No report found with the provided ID');
      }

      const total_report_count = await this.getTotalReportCount();

      return {
        ...successResponse(
          HttpStatuses.OK,
          null,
          'Report has been deleted successfully',
        ),
        total_report_count,
      };
    } catch (error: any) {
      return errorResponse(
        HttpStatuses.INTERNAL_SERVER_ERROR,
        'Failed to delete the report. Please try again later.',
        error,
      );
    }
  }
}




