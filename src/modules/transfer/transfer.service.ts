import { Injectable } from '@nestjs/common';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { UpdateTransferDto } from './dto/update-transfer.dto';
import { InjectModel } from '@nestjs/sequelize';
import { Transfer } from './entities/transfer.entity';
import { Employee } from '../employee/entities/employee.entity';
import { Office } from '../office/entities/office.entity';
import { Client } from '../client/entities/client.entity';
import { errorResponse, successResponse } from '../../helpers/responseFunctions';
import { HttpStatuses } from '../../helpers/httpStatuses.enum';
import { TtpPayment } from '../ttp_payment/entities/ttp_payment.entity';
import { Sequelize } from 'sequelize-typescript';
import { I18nService } from 'nestjs-i18n';

@Injectable()
export class TransferService {
  constructor(
    @InjectModel(Transfer) private transferRepository: typeof Transfer,
    @InjectModel(TtpPayment) private ttpPaymentRepo: typeof TtpPayment,
    private sequelize: Sequelize,
    private readonly i18n: I18nService,
  ) { }

  private getIncludes() {
    return [
      {
        model: Employee, as: 'operator', attributes: ['guid', 'fullName'],
        include: [{ model: Office, attributes: ['guid', 'fullName', 'shortName'] }]
      },
      { model: Client, attributes: ['guid', 'fullName'] },
      {
        model: Employee, as: 'preparedOpr', attributes: ['guid', 'fullName'],
        include: [{ model: Office, attributes: ['guid', 'fullName', 'shortName'] }]
      },
    ];
  }

  private getAttributes() {
    return {
      include: [
        [
          Sequelize.literal(`(
            SELECT ROUND(COALESCE(SUM(amount), 0)::numeric, 2)
            FROM "tbl_TTP_payments" AS tp
            WHERE tp.transfer_guid = "Transfer"."guid"
          )`),
          'totalPaid'
        ],
        [
          Sequelize.literal(`(
            SELECT 
              CASE 
                WHEN SUM(tp.amount) IS NULL OR SUM(tp.amount) = 0 THEN '0%'
                WHEN "Transfer".price > 0 
                THEN CONCAT(ROUND(((SUM(tp.amount) / "Transfer".price) * 100)::numeric, 2), '%')
                ELSE '100%' 
              END
            FROM "tbl_TTP_payments" AS tp
            WHERE tp.transfer_guid = "Transfer"."guid"
          )`),
          'paidPercentage'
        ]
      ]
    };
  }

  async addTransfer(createDto: CreateTransferDto, lang: string) {
    const t = await this.sequelize.transaction();
    try {
      const transfer = await this.transferRepository.create({ ...createDto } as any, { hooks: true, transaction: t });

      if (createDto.is_paid === true) {
        await this.ttpPaymentRepo.create({
          transfer_guid: transfer.guid,
          amount: transfer.price || 0,
          payment_date: new Date(),
          opr_guid: createDto.opr_guid
        } as any, { transaction: t });
      }
      await t.commit();
      const newTransfer = await this.transferRepository.findOne({
        where: { guid: transfer.guid },
        attributes: {
          exclude: ['opr_guid', 'client_guid', 'prepared_opr_guid'],
          include: this.getAttributes().include as any
        },
        include: this.getIncludes()
      });
      return { status: 201, data: newTransfer, message: this.i18n.t('transfer.created', { lang }) };
    } catch (error: any) {
      await t.rollback();
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('transfer.createFailed', { lang }), error);
    }
  }

  async getAllTransfer(page: number = 1, limit: number = 10, lang: string = 'tk') {
    try {
      const currentPage = Math.max(1, Number(page));
      const currentLimit = Math.max(1, Number(limit));
      const offset = (currentPage - 1) * currentLimit;

      const { rows, count } = await this.transferRepository.findAndCountAll({
        attributes: {
          exclude: ['opr_guid', 'client_guid', 'prepared_opr_guid'],
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
        message: this.i18n.t('transfer.listFetched', { lang }),
      };
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('transfer.fetchFailed', { lang }), error);
    }
  }

  async updateTransfer(updateDto: UpdateTransferDto, lang: string) {
    try {
      const transfer = await this.transferRepository.findOne({
        where: { guid: updateDto.guid }
      });

      if (!transfer) {
        return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('transfer.notFound', { lang }));
      }
      await transfer.update(updateDto);
      const updatedTransfer = await this.transferRepository.findOne({
        where: { guid: updateDto.guid },
        attributes: {
          exclude: ['opr_guid', 'client_guid', 'prepared_opr_guid'],
          include: this.getAttributes().include as any
        },
        include: this.getIncludes()
      });

      return { status: 200, data: updatedTransfer, message: this.i18n.t('transfer.updated', { lang }) };
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('transfer.updateFailed', { lang }), error);
    }
  }

  async deleteTransfer(guid: string, lang: string) {
    try {
      const transfer = await this.transferRepository.findByPk(guid);
      if (!transfer) return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('transfer.notFound', { lang }));
      await transfer.destroy();
      return successResponse(HttpStatuses.OK, null, this.i18n.t('transfer.deleted', { lang }));
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('transfer.deleteFailed', { lang }), error);
    }
  }
}