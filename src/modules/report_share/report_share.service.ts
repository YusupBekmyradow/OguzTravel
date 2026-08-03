import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { CreateReportShareDto } from './dto/create-report_share.dto';
import { UpdateReportShareDto } from './dto/update-report_share.dto';
import { ReportShare } from './entities/report_share.entity';
import { Report } from '../report/entities/report.entity';
import { Employee } from '../employee/entities/employee.entity';
import { errorResponse, successResponse } from '../../helpers/responseFunctions';
import { HttpStatuses } from '../../helpers/httpStatuses.enum';
import { Op } from 'sequelize';

@Injectable()
export class ReportShareService {
  constructor(
    @InjectModel(ReportShare)
    private readonly reportShareRepository: typeof ReportShare,
    @InjectModel(Report)
    private readonly reportRepository: typeof Report,
  ) { }

  async getTotalReportCount() {
    const totalLetterSum = await this.reportRepository.sum('total_letter') || 0;
    const totalCountSum = await this.reportShareRepository.sum('total_count') || 0;
    return totalLetterSum - totalCountSum;
  }

  async addReportShare(createReportShareDto: CreateReportShareDto) {
    try {
      const reportShare = await this.reportShareRepository.create({
        ...createReportShareDto,
      } as any);

      const newReportShare = await this.reportShareRepository.findOne({
        where: { guid: reportShare.guid },
        include: [
          { model: Employee, as: 'reportAS_operator', attributes: ['guid', 'fullName'] },
          { model: Employee, as: 'reportRE_operator', attributes: ['guid', 'fullName'] },
        ],
      });

      const total_report_count = await this.getTotalReportCount();

      return {
        ...successResponse(
          HttpStatuses.CREATED,
          newReportShare,
          'Report share created successfully',
        ),
        total_report_count,
      };
    } catch (error: any) {
      return errorResponse(
        HttpStatuses.INTERNAL_SERVER_ERROR,
        'Report share creation failed',
        error,
      );
    }
  }

  async getAllReportShares(
    page: number = 1,
    limit: number = 10,
    assignment_opr_guid?: string,
    receiver_opr_guid?: string,
  ) {
    try {
      const currentPage = Math.max(1, Number(page));
      const currentLimit = Math.max(1, Number(limit));
      const offset = (currentPage - 1) * currentLimit;

      const whereClause: any = {};
      if (assignment_opr_guid) {
        whereClause.assignment_opr_guid = assignment_opr_guid;
      }
      if (receiver_opr_guid) {
        whereClause.receiver_opr_guid = receiver_opr_guid;
      }

      const { count, rows } = await this.reportShareRepository.findAndCountAll({
        where: whereClause,
        limit: currentLimit,
        offset,
        order: [['createdAt', 'DESC']],
        include: [
          { model: Employee, as: 'reportAS_operator', attributes: ['guid', 'fullName'] },
          { model: Employee, as: 'reportRE_operator', attributes: ['guid', 'fullName'] },
        ],
      });

      const total_report_count = await this.getTotalReportCount();

      return {
        status: 200,
        data: rows,
        meta: {
          totalItems: count,
          itemCount: rows.length,
          itemsPerPage: currentLimit,
          totalPages: Math.ceil(count / currentLimit),
          currentPage: currentPage,
        },
        message: 'Report shares fetched successfully',
        total_report_count,
      };
    } catch (error: any) {
      return errorResponse(
        HttpStatuses.INTERNAL_SERVER_ERROR,
        'Report shares fetch failed',
        error,
      );
    }
  }

  async updateReportShare(updateReportShareDto: UpdateReportShareDto) {
    try {
      const { guid, ...updateData } = updateReportShareDto;

      const existingReportShare = await this.reportShareRepository.findByPk(guid);
      if (!existingReportShare) {
        return errorResponse(HttpStatuses.NOT_FOUND, 'Report share not found');
      }

      await existingReportShare.update(updateData as any);

      const updatedReportShare = await this.reportShareRepository.findOne({
        where: { guid },
        include: [
          { model: Employee, as: 'reportAS_operator', attributes: ['guid', 'fullName'] },
          { model: Employee, as: 'reportRE_operator', attributes: ['guid', 'fullName'] },
        ],
      });

      const total_report_count = await this.getTotalReportCount();

      return {
        ...successResponse(
          HttpStatuses.OK,
          updatedReportShare,
          'Report share updated successfully',
        ),
        total_report_count,
      };
    } catch (error: any) {
      return errorResponse(
        HttpStatuses.INTERNAL_SERVER_ERROR,
        'Report share update failed',
        error,
      );
    }
  }

  async deleteReportShare(guid: string) {
    try {
      const reportShare = await this.reportShareRepository.findByPk(guid);
      if (!reportShare) {
        return errorResponse(HttpStatuses.NOT_FOUND, 'Report share not found');
      }

      await reportShare.destroy();

      const total_report_count = await this.getTotalReportCount();

      return {
        ...successResponse(
          HttpStatuses.OK,
          null,
          'Report share deleted successfully',
        ),
        total_report_count,
      };
    } catch (error: any) {
      return errorResponse(
        HttpStatuses.INTERNAL_SERVER_ERROR,
        'Report share delete failed',
        error,
      );
    }
  }
}
