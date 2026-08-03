import { Injectable } from '@nestjs/common';
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
          'Report created successfully',
        ),
        total_report_count,
      };
    } catch (error: any) {
      return errorResponse(
        HttpStatuses.INTERNAL_SERVER_ERROR,
        'Report creation failed',
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
        message: 'Reports fetched successfully',
        total_report_count,
      };
    } catch (error: any) {
      return errorResponse(
        HttpStatuses.INTERNAL_SERVER_ERROR,
        'Reports fetch failed',
        error,
      );
    }
  }

  async updateReport(updateReportDto: UpdateReportDto) {
    try {
      const { guid, ...updateData } = updateReportDto;
      const report = await this.reportRepository.findOne({ where: { guid } });
      if (!report) {
        return errorResponse(HttpStatuses.NOT_FOUND, 'Report not found');
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
          'Report updated successfully',
        ),
        total_report_count,
      };
    } catch (error: any) {
      return errorResponse(
        HttpStatuses.INTERNAL_SERVER_ERROR,
        'Report update failed',
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
        return errorResponse(HttpStatuses.NOT_FOUND, 'Report not found');
      }

      const total_report_count = await this.getTotalReportCount();

      return {
        ...successResponse(
          HttpStatuses.OK,
          null,
          'Report deleted successfully',
        ),
        total_report_count,
      };
    } catch (error: any) {
      return errorResponse(
        HttpStatuses.INTERNAL_SERVER_ERROR,
        'Report delete failed',
        error,
      );
    }
  }
}
