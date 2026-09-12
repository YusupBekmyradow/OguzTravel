import { Injectable, OnModuleInit } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
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
export class GeneralTranslationService implements OnModuleInit {
  constructor(
    @InjectModel(GeneralTranslation) private translationRepository: typeof GeneralTranslation,
    @InjectModel(TransPayment) private transPaymentRepo: typeof TransPayment,
    private sequelize: Sequelize,
    private readonly i18n: I18nService,
  ) { }

  async onModuleInit() {
    try {
      await this.sequelize.query(`
        ALTER TABLE "tbl_general_translations" 
        ADD COLUMN IF NOT EXISTS "expense_price" NUMERIC(12, 2) DEFAULT 0;
      `);
    } catch (e) {
      // Ignore if table doesn't exist yet or already altered
    }
  }

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

  async addGeneralTranslation(createDto: any, lang: string) {
    const t = await this.sequelize.transaction();
    try {
      const price = Number(createDto.price) || 0;
      const expensePrice = Number(createDto.expense_price) || 0;
      const profit = Number((price - expensePrice).toFixed(2));

      const translation = await this.translationRepository.create({
        ...createDto,
        price,
        expense_price: expensePrice,
        profit
      } as any, { hooks: true, transaction: t });

      if ((createDto.is_paid === true || createDto.is_paid === 'true' || createDto.status === '0' || createDto.status === 0) && (Number(translation.price) || 0) > 0) {
        await this.transPaymentRepo.create({
          translation_guid: translation.guid,
          amount: Number(translation.price) || 0,
          payment_date: new Date(),
          opr_guid: createDto.opr_guid || translation.opr_guid
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

      return { status: 201, data: newTranslation, message: this.i18n.t('general_translation.created', { lang }) };
    } catch (error: any) {
      await t.rollback();
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('general_translation.createFailed', { lang }), error);
    }
  }



  async getAllGeneralTranslation(page: number = 1, limit: number = 10, lang: string = 'tk') {
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
        message: this.i18n.t('general_translation.listFetched', { lang })
      };
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('general_translation.fetchFailed', { lang }), error);
    }
  }


  async searchAndFilterTranslations(filters: {
    search?: string;
    start_received_day?: string;
    end_received_day?: string;
    received_time?: string;
    opr_guid?: string;
    completed_time?: string;
    start_completed_day?: string;
    end_completed_day?: string;
    translator_guid?: string;
    page?: number;
    limit?: number;
  }, lang: string = 'tk') {
    try {
      const page = Math.max(1, Number(filters.page || 1));
      const limit = Math.max(1, Number(filters.limit || 10));
      const offset = (page - 1) * limit;

      const whereConditions: any = {};

      const startRec = filters.start_received_day?.trim();
      const endRec = filters.end_received_day?.trim();
      if (startRec && endRec) {
        whereConditions.received_day = { [Op.between]: [startRec, endRec] };
      } else if (startRec) {
        whereConditions.received_day = { [Op.gte]: startRec };
      } else if (endRec) {
        whereConditions.received_day = { [Op.lte]: endRec };
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

      const startComp = filters.start_completed_day?.trim();
      const endComp = filters.end_completed_day?.trim();
      if (startComp && endComp) {
        whereConditions.completed_day = { [Op.between]: [startComp, endComp] };
      } else if (startComp) {
        whereConditions.completed_day = { [Op.gte]: startComp };
      } else if (endComp) {
        whereConditions.completed_day = { [Op.lte]: endComp };
      }

      if (filters.translator_guid && filters.translator_guid.trim() !== '') {
        whereConditions.translator_guid = filters.translator_guid;
      }

      if (filters.search && filters.search.trim() !== '') {
        const searchTerm = `%${filters.search.trim()}%`;
        whereConditions[Op.or] = [
          { source_to_target: { [Op.iLike]: searchTerm } },
          { note: { [Op.iLike]: searchTerm } },
          { status: { [Op.iLike]: searchTerm } },
          { correction_status: { [Op.iLike]: searchTerm } },
          Sequelize.where(
            Sequelize.cast(Sequelize.col('GeneralTranslation.index_number'), 'TEXT'),
            { [Op.iLike]: searchTerm }
          ),
          Sequelize.where(
            Sequelize.col('client.fullName'),
            { [Op.iLike]: searchTerm }
          ),
          Sequelize.where(
            Sequelize.col('operator.fullName'),
            { [Op.iLike]: searchTerm }
          ),
          Sequelize.where(
            Sequelize.col('translator.fullName'),
            { [Op.iLike]: searchTerm }
          ),
        ];
      }

      const hasSearch = !!(filters.search && filters.search.trim() !== '');

      const [{ rows, count }, totalPriceResult] = await Promise.all([this.translationRepository.findAndCountAll({
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
      }),
      this.translationRepository.findOne({
        where: whereConditions,
        include: hasSearch
          ? [
            { association: 'client', attributes: [] },
            { association: 'operator', attributes: [] },
            { association: 'translator', attributes: [] },
          ]
          : [],
        attributes: [
          [Sequelize.fn('SUM', Sequelize.col('GeneralTranslation.price')), 'totalPrice'],
          [Sequelize.fn('SUM', Sequelize.col('GeneralTranslation.expense_price')), 'totalExpensePrice']
        ],
        raw: true,
      }),
      ]);

      const totalPrice = Number(Number((totalPriceResult as any)?.totalPrice || 0).toFixed(2));
      const totalExpensePrice = Number(Number((totalPriceResult as any)?.totalExpensePrice || 0).toFixed(2));
      const totalProfit = Number((totalPrice - totalExpensePrice).toFixed(2));

      return {
        status: 200,
        data: rows,
        meta: {
          totalItems: count,
          totalPages: Math.ceil(count / limit),
          currentPage: page,
          itemsPerPage: limit,
          totalPrice: totalPrice,
          totalExpensePrice: totalExpensePrice,
          totalProfit: totalProfit
        },
        message: this.i18n.t('general_translation.listFetched', { lang })
      };
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('general_translation.fetchFailed', { lang }), error);
    }
  }



  async updateGeneralTranslation(updateDto: any, lang: string) {
    const t = await this.sequelize.transaction();
    try {
      const translation = await this.translationRepository.findOne({
        where: { guid: updateDto.guid },
        transaction: t
      });

      if (!translation) {
        await t.rollback();
        return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('general_translation.notFound', { lang }));
      }

      const targetPrice = updateDto.price !== undefined ? Number(updateDto.price) : Number(translation.price || 0);
      const targetExpensePrice = updateDto.expense_price !== undefined ? Number(updateDto.expense_price) : Number(translation.expense_price || 0);
      const targetProfit = Number((targetPrice - targetExpensePrice).toFixed(2));
      const operatorGuid = updateDto.opr_guid || translation.opr_guid;

      if (updateDto.status === '0' || updateDto.status === 0) {
        await this.transPaymentRepo.destroy({
          where: { translation_guid: translation.guid },
          transaction: t
        });

        if (targetPrice > 0) {
          await this.transPaymentRepo.create({
            translation_guid: translation.guid,
            amount: targetPrice,
            payment_date: new Date(),
            opr_guid: operatorGuid
          } as any, { transaction: t });
        }
      } else {
        const isPaidTrue = updateDto.is_paid === true || updateDto.is_paid === 'true';
        const isPaidFalse = updateDto.is_paid === false || updateDto.is_paid === 'false';
        const willBePaid = isPaidTrue || (translation.is_paid === true && !isPaidFalse);

        if (willBePaid) {
          const payments = await this.transPaymentRepo.findAll({
            where: { translation_guid: translation.guid },
            order: [['index_number', 'ASC']],
            transaction: t
          });

          const currentTotalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
          const diff = Number((targetPrice - currentTotalPaid).toFixed(2));

          if (diff !== 0) {
            if (payments.length === 0) {
              if (targetPrice > 0) {
                await this.transPaymentRepo.create({
                  translation_guid: translation.guid,
                  amount: targetPrice,
                  payment_date: new Date(),
                  opr_guid: operatorGuid
                } as any, { transaction: t });
              }
            } else if (payments.length === 1) {
              await payments[0].update({
                amount: targetPrice,
                opr_guid: operatorGuid || payments[0].opr_guid
              }, { transaction: t });
            } else if (diff > 0) {
              const lastPayment = payments[payments.length - 1];
              await lastPayment.update({
                amount: Number((Number(lastPayment.amount) + diff).toFixed(2)),
                opr_guid: operatorGuid || lastPayment.opr_guid
              }, { transaction: t });
            } else {
              let amountToReduce = Math.abs(diff);
              for (let i = payments.length - 1; i >= 0 && amountToReduce > 0; i--) {
                const p = payments[i];
                const pAmount = Number(p.amount);
                if (pAmount <= amountToReduce && i > 0) {
                  await p.destroy({ transaction: t });
                  amountToReduce = Number((amountToReduce - pAmount).toFixed(2));
                } else {
                  const newAmount = Math.max(0, Number((pAmount - amountToReduce).toFixed(2)));
                  await p.update({
                    amount: newAmount,
                    opr_guid: operatorGuid || p.opr_guid
                  }, { transaction: t });
                  amountToReduce = 0;
                }
              }
            }
          }
        }
      }

      await translation.update({
        ...updateDto,
        expense_price: targetExpensePrice,
        profit: targetProfit,
      } as any, { transaction: t });

      await t.commit();

      const updatedTranslation = await this.translationRepository.findOne({
        where: { guid: updateDto.guid },
        attributes: {
          exclude: ['opr_guid', 'client_guid', 'translator_guid', 'status_guid'],
          include: this.getAttributes().include as any
        },
        include: this.getIncludes()
      });

      return { status: 200, data: updatedTranslation, message: this.i18n.t('general_translation.updated', { lang }) };
    } catch (error: any) {
      await t.rollback();
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('general_translation.updateFailed', { lang }), error);
    }
  }


  async deleteGeneralTranslation(guid: string, lang: string) {
    const t = await this.sequelize.transaction();
    try {
      const translation = await this.translationRepository.findByPk(guid, { transaction: t });
      if (!translation) {
        await t.rollback();
        return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('general_translation.notFound', { lang }));
      }

      await this.transPaymentRepo.destroy({ where: { translation_guid: guid }, transaction: t });
      await translation.destroy({ transaction: t });
      await t.commit();
      return successResponse(HttpStatuses.OK, null, this.i18n.t('general_translation.deleted', { lang }));
    } catch (error: any) {
      await t.rollback();
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('general_translation.deleteFailed', { lang }), error);
    }
  }
}







