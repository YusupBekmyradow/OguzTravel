import { Injectable } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { InjectModel } from '@nestjs/sequelize';
import { Report } from './entities/report.entity';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { errorResponse, successResponse } from '../../helpers/responseFunctions';
import { HttpStatuses } from '../../helpers/httpStatuses.enum';
import { Op, QueryTypes } from 'sequelize';

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



  private async checkReportRange(
    data: { start_yh_number?: string; end_yh_number?: string },
    lang: string,
    ignoreGuid?: string,
    transaction?: any,
  ) {
    const isDigits = (value?: string) => typeof value === 'string' && /^[0-9]{1,20}$/.test(value);

    if (!isDigits(data.start_yh_number) || !isDigits(data.end_yh_number)) {
      const errorMsg = lang === 'ru'
        ? 'Введен неверный или пересекающийся диапазон'
        : lang === 'en'
          ? 'Invalid or malformed number range provided'
          : 'Ýalňyş ýa-da kesişýän aralyk girizildi';
      return { error: errorResponse(HttpStatuses.BAD_REQUEST, errorMsg) };
    }

    const start = BigInt(data.start_yh_number!);
    const end = BigInt(data.end_yh_number!);

    if (end < start) {
      const errorMsg = lang === 'ru'
        ? 'Введен неверный или пересекающийся диапазон'
        : lang === 'en'
          ? 'Invalid or malformed number range provided'
          : 'Ýalňyş ýa-da kesişýän aralyk girizildi';
      return { error: errorResponse(HttpStatuses.BAD_REQUEST, errorMsg) };
    }

    const conditions: any[] = [
      {
        [Op.and]: [
          { start_yh_number: { [Op.lte]: data.end_yh_number } },
          { end_yh_number: { [Op.gte]: data.start_yh_number } },
        ],
      },
    ];

    if (ignoreGuid) {
      conditions.push({ guid: { [Op.ne]: ignoreGuid } });
    }

    const overlapping = await this.reportRepository.findOne({
      where: { [Op.and]: conditions },
      attributes: ['start_yh_number', 'end_yh_number'],
      transaction,
      lock: transaction ? transaction.LOCK.UPDATE : false,
    });

    if (overlapping) {
      let message = '';
      try {
        message = await this.i18n.t('report.rangeOverlap', { lang });
      } catch (e) {
        message = '';
      }
      if (!message || message === 'report.rangeOverlap') {
        if (lang === 'ru') {
          message = `Введенный диапазон (${overlapping.start_yh_number} - ${overlapping.end_yh_number}) уже пересекается с другим отчетом!`;
        } else if (lang === 'en') {
          message = `The entered range (${overlapping.start_yh_number} - ${overlapping.end_yh_number}) overlaps with an existing report!`;
        } else {
          message = `Girilen aralyk (${overlapping.start_yh_number} - ${overlapping.end_yh_number}) eýýäm başga bir hasabat bilen kesişýär!`;
        }
      } else {
        message = message
          .replace('{start}', overlapping.start_yh_number)
          .replace('{end}', overlapping.end_yh_number);
      }

      return {
        error: errorResponse(HttpStatuses.CONFLICT, message),
      };
    }

    const total_letter = Number(end - start + 1n);
    return { start_yh_number: data.start_yh_number!, end_yh_number: data.end_yh_number!, total_letter };
  }





  async addReport(createReportDto: CreateReportDto, lang: string = 'tk') {
    const transaction = await this.reportRepository.sequelize!.transaction();
    try {
      const rangeCheck = await this.checkReportRange(
        {
          start_yh_number: createReportDto.start_yh_number,
          end_yh_number: createReportDto.end_yh_number,
        },
        lang,
        undefined,
        transaction,
      );

      if ('error' in rangeCheck) {
        await transaction.rollback();
        return rangeCheck.error;
      }

      const report = await this.reportRepository.create(
        {
          ...createReportDto,
          total_letter: rangeCheck.total_letter,
        } as any,
        { transaction },
      );
      await transaction.commit();
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
      await transaction.rollback();
      return errorResponse(
        HttpStatuses.INTERNAL_SERVER_ERROR,
        this.i18n.t('report.createFailed', { lang }),
        error,
      );
    }
  }



  async updateReport(updateReportDto: UpdateReportDto, lang: string = 'tk') {
    const transaction = await this.reportRepository.sequelize!.transaction();
    try {
      const { guid, ...updateData } = updateReportDto;
      const report = await this.reportRepository.findOne({
        where: { guid },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!report) {
        await transaction.rollback();
        return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('report.notFound', { lang }));
      }

      const targetStart = updateData.start_yh_number ?? report.start_yh_number;
      const targetEnd = updateData.end_yh_number ?? report.end_yh_number;

      const rangeCheck = await this.checkReportRange(
        {
          start_yh_number: targetStart,
          end_yh_number: targetEnd,
        },
        lang,
        guid,
        transaction,
      );

      if ('error' in rangeCheck) {
        await transaction.rollback();
        return rangeCheck.error;
      }

      await report.update(
        {
          ...updateData,
          start_yh_number: rangeCheck.start_yh_number,
          end_yh_number: rangeCheck.end_yh_number,
          total_letter: rangeCheck.total_letter,
        },
        { transaction },
      );
      await transaction.commit();

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
      await transaction.rollback();
      return errorResponse(
        HttpStatuses.INTERNAL_SERVER_ERROR,
        this.i18n.t('report.updateFailed', { lang }),
        error,
      );
    }
  }



  async getAllReports(
    page: number = 1,
    limit: number = 10,
    search?: string,
    lang: string = 'tk',
    dates: { start_date?: string; end_date?: string } = {},
  ) {
    try {
      // A batch is filtered by the local (Ashgabat) day it was created on, both ends included.
      const day = (value?: string) => {
        const v = value?.trim().slice(0, 10);
        return v && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) ? v : null;
      };
      const pageNum = Math.max(1, Number(page) || 1);
      const limitNum = Math.max(1, Math.min(100, Number(limit) || 10));
      const offset = (pageNum - 1) * limitNum;

      const replacements: any = {
        limit: limitNum,
        offset,
        search: search?.trim() ? `%${search.trim()}%` : null,
        startDate: day(dates.start_date),
        endDate: day(dates.end_date),
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
        AND (:startDate::date IS NULL OR ("createdAt" AT TIME ZONE 'Asia/Ashgabat')::date >= :startDate::date)
        AND (:endDate::date IS NULL OR ("createdAt" AT TIME ZONE 'Asia/Ashgabat')::date <= :endDate::date)
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
