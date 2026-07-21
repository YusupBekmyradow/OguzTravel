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

      const isPaidStr = String(createDto.is_paid);
      const isPaidNum = Number(createDto.is_paid);

      if (isPaidStr === 'true' || isPaidStr === '1' || (!isNaN(isPaidNum) && isPaidNum > 0)) {
        const paymentAmount = (!isNaN(isPaidNum) && isPaidNum > 0)
          ? isPaidNum
          : (translation.price || 0);

        await this.transPaymentRepo.create({
          translation_guid: translation.guid,
          amount: paymentAmount,
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
