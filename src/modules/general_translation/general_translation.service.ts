import { Injectable } from '@nestjs/common';
import { CreateGeneralTranslationDto } from './dto/create-general_translation.dto';
import { UpdateGeneralTranslationDto } from './dto/update-general_translation.dto';
import { InjectModel } from '@nestjs/sequelize';
import { GeneralTranslation } from './entities/general_translation.entity';
import { Employee } from '../employee/entities/employee.entity';
import { Client } from '../client/entities/client.entity';
import { Translator } from '../translator/entities/translator.entity';
import { Office } from '../office/entities/office.entity';
import { errorResponse, successResponse } from '../../helpers/responseFunctions';
import { HttpStatuses } from '../../helpers/httpStatuses.enum';
import { Sequelize } from 'sequelize-typescript';
import { TransPayment } from '../trans_payment/entities/trans_payment.entity';
import { Op } from 'sequelize';

@Injectable()
export class GeneralTranslationService {
  constructor(
    @InjectModel(GeneralTranslation) private translationRepository: typeof GeneralTranslation,
    @InjectModel(TransPayment) private transPaymentRepo: typeof TransPayment,
    private sequelize: Sequelize,
  ) { }

  private getIncludes() {
    return [
      {
        model: Employee, attributes: ['guid', 'fullName'],
        include: [{ model: Office, attributes: ['guid', 'fullName', 'shortName'] }]
      },
      { model: Client, attributes: ['guid', 'fullName'] },
      { model: Translator, attributes: ['guid', 'fullName'] },
    ];
  }

  private getAttributes() {
    return {
      include: [
        [
          Sequelize.literal(`(
            SELECT ROUND(COALESCE(SUM(amount), 0)::numeric, 2)
            FROM "tbl_trans_payments" AS tp
            WHERE tp.translation_guid = "GeneralTranslation"."guid"
          )`),
          'totalPaid'
        ],
        [
          Sequelize.literal(`(
            SELECT 
              CASE 
                WHEN SUM(tp.amount) IS NULL OR SUM(tp.amount) = 0 THEN '0%'
                WHEN "GeneralTranslation".price > 0 
                THEN CONCAT(ROUND(((SUM(tp.amount) / "GeneralTranslation".price) * 100)::numeric, 2), '%')
                ELSE '100%' 
              END
            FROM "tbl_trans_payments" AS tp
            WHERE tp.translation_guid = "GeneralTranslation"."guid"
          )`),
          'paidPercentage'
        ]
      ]
    };
  }

  async addGeneralTranslation(createDto: CreateGeneralTranslationDto) {
    const t = await this.sequelize.transaction();
    try {
      const translation = await this.translationRepository.create({
        ...createDto
      } as any, { transaction: t });

      if (createDto.is_paid === true) {
        await this.transPaymentRepo.create({
          translation_guid: translation.guid,
          amount: translation.price || 0,
          payment_date: new Date(),
          opr_guid: createDto.opr_guid
        } as any, { transaction: t });
      }

      await t.commit();

      const newTranslation = await this.translationRepository.findOne({
        where: { guid: translation.guid },
        attributes: {
          exclude: ['opr_guid', 'client_guid', 'translator_guid', 'status_guid'],
          include: this.getAttributes().include as any
        },
        include: this.getIncludes()
      });

      return { status: 201, data: newTranslation, message: 'Translation created successfully' };
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Translation creation failed', error);
    }
  }



  async getAllGeneralTranslation(page: number = 1, limit: number = 10) {
    try {
      const currentPage = Math.max(1, Number(page));
      const currentLimit = Math.max(1, Number(limit));
      const offset = (currentPage - 1) * currentLimit;

      const { rows, count } = await this.translationRepository.findAndCountAll({
        attributes: {
          exclude: ['opr_guid', 'client_guid', 'translator_guid', 'status_guid'],
          include: this.getAttributes().include as any
        },
        include: this.getIncludes(),
        order: [['index_number', 'DESC']],
        limit: currentLimit,
        offset: offset,
      });

      return {
        status: 200,
        data: rows,
        meta: { totalItems: count, totalPages: Math.ceil(count / currentLimit), currentPage },
        message: 'Translations fetched successfully'
      };
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Translation fetching error', error);
    }
  }


  async searchAndFilterTranslations(filters: {
    search?: string;
    received_day?: string;
    received_time?: string;
    opr_guid?: string;
    completed_time?: string;
    completed_day?: string;
    translator_guid?: string;
    page?: number;
    limit?: number;
  }) {
    try {
      const page = Math.max(1, Number(filters.page || 1));
      const limit = Math.max(1, Number(filters.limit || 10));
      const offset = (page - 1) * limit;

      const whereConditions: any = {};

      if (filters.received_day && filters.received_day.trim() !== '') {
        whereConditions.received_day = filters.received_day;
      }
      if (filters.received_time && filters.received_time.trim() !== '') {
        whereConditions[Op.and] = whereConditions[Op.and] || [];
        whereConditions[Op.and].push(
          Sequelize.where(
            Sequelize.cast(Sequelize.col('GeneralTranslation.received_time'), 'TEXT'),
            { [Op.iLike]: `%${filters.received_time.trim()}%` }
          )
        );
      }
      if (filters.opr_guid && filters.opr_guid.trim() !== '') {
        whereConditions.opr_guid = filters.opr_guid;
      }
      if (filters.completed_time && filters.completed_time.trim() !== '') {
        whereConditions[Op.and] = whereConditions[Op.and] || [];
        whereConditions[Op.and].push(
          Sequelize.where(
            Sequelize.cast(Sequelize.col('GeneralTranslation.completed_time'), 'TEXT'),
            { [Op.iLike]: `%${filters.completed_time.trim()}%` }
          )
        );
      }
      if (filters.completed_day && filters.completed_day.trim() !== '') {
        whereConditions.completed_day = filters.completed_day;
      }
      if (filters.translator_guid && filters.translator_guid.trim() !== '') {
        whereConditions.translator_guid = filters.translator_guid;
      }

      if (filters.search && filters.search.trim() !== '') {
        const searchTerm = `%${filters.search.trim()}%`;
        whereConditions[Op.or] = [
          { source_to_target: { [Op.iLike]: searchTerm } },
          { '$client.fullName$': { [Op.iLike]: searchTerm } },
          { '$translator.fullName$': { [Op.iLike]: searchTerm } }
        ];
      }

      const { rows, count } = await this.translationRepository.findAndCountAll({
        where: whereConditions,
        attributes: {
          exclude: ['opr_guid', 'client_guid', 'translator_guid', 'status_guid'],
          include: this.getAttributes().include as any
        },
        include: this.getIncludes(),
        order: [['index_number', 'DESC']],
        limit: limit,
        offset: offset,
        distinct: true,
      });

      return {
        status: 200,
        data: rows,
        meta: {
          totalItems: count,
          totalPages: Math.ceil(count / limit),
          currentPage: page,
          itemsPerPage: limit
        },
        message: 'Filtered translations fetched successfully'
      };
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Filtering and search failed', error);
    }
  }


  async updateGeneralTranslation(updateDto: UpdateGeneralTranslationDto) {
    const t = await this.sequelize.transaction();
    try {
      const translation = await this.translationRepository.findOne({
        where: { guid: updateDto.guid },
        transaction: t
      });

      if (!translation) {
        await t.rollback();
        return errorResponse(HttpStatuses.NOT_FOUND, 'Translation not found');
      }

      await translation.update(updateDto as any, { transaction: t });

      await t.commit();

      const updatedTranslation = await this.translationRepository.findOne({
        where: { guid: updateDto.guid },
        attributes: {
          exclude: ['opr_guid', 'client_guid', 'translator_guid', 'status_guid'],
          include: this.getAttributes().include as any
        },
        include: this.getIncludes()
      });

      return { status: 200, data: updatedTranslation, message: 'Translation updated successfully' };
    } catch (error: any) {
      await t.rollback();
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Update failed', error);
    }
  }


  async deleteGeneralTranslation(guid: string) {
    try {
      const translation = await this.translationRepository.findByPk(guid);
      if (!translation) return errorResponse(HttpStatuses.NOT_FOUND, 'Translation not found');

      await translation.destroy();
      return successResponse(HttpStatuses.OK, null, 'Translation deleted successfully');
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Deletion failed', error);
    }
  }
}
