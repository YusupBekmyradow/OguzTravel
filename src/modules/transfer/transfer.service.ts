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
import { QueryTypes } from 'sequelize';

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

      if (createDto.is_paid === 1 && (Number(transfer.price) || 0) > 0) {
        await this.ttpPaymentRepo.create({
          transfer_guid: transfer.guid,
          amount: Number(transfer.price) || 0,
          payment_date: new Date(),
          opr_guid: createDto.opr_guid || transfer.opr_guid
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



  async getAllTransfer(
    page: number = 1,
    limit: number = 10,
    search?: string,
    application_date?: string,
    opr_guid?: string,
    prepared_opr_guid?: string,
    transfer_type?: string,
    machine_type?: string,
    is_paid?: number,
    system?: string,
    lang: string = 'tk',
  ) {
    try {
      const currentPage = Math.max(1, Number(page));
      const currentLimit = Math.max(1, Number(limit));
      const offset = (currentPage - 1) * currentLimit;

      const replacements: any = {
        limit: currentLimit,
        offset,
        search: search ? `%${search}%` : null,
        application_date: application_date || null,
        opr_guid: opr_guid || null,
        prepared_opr_guid: prepared_opr_guid || null,
        transfer_type: transfer_type || null,
        machine_type: machine_type || null,
        is_paid: is_paid !== undefined && is_paid !== null ? is_paid : null,
        system: system || null,
      };
      const sqlQuery = `
        SELECT 
          tr.guid, tr.index_number, tr.application_date, tr.destination_country, 
          tr.transfer_type, tr.route, tr.machine_type, tr.guests_count, 
          tr.net_fare, tr.currency, tr.price, tr.profit, tr.system, tr.note, 
          tr.is_paid, tr."createdAt", tr."updatedAt",

          ROUND(COALESCE(SUM(tp.amount), 0)::numeric, 2) AS "totalPaid",
          CASE 
            WHEN COALESCE(SUM(tp.amount), 0) = 0 THEN '0%' 
            WHEN tr.price > 0 THEN CONCAT(ROUND(((SUM(tp.amount) / tr.price) * 100)::numeric, 2), '%') 
            ELSE '100%' 
          END AS "paidPercentage",

          JSON_BUILD_OBJECT('guid', c.guid, 'fullName', c."fullName") AS client,
          JSON_BUILD_OBJECT(
            'guid', op.guid, 'fullName', op."fullName",
            'office', JSON_BUILD_OBJECT('guid', off1.guid, 'fullName', off1."fullName", 'shortName', off1."shortName")
          ) AS operator,
          JSON_BUILD_OBJECT(
            'guid', pop.guid, 'fullName', pop."fullName",
            'office', JSON_BUILD_OBJECT('guid', off2.guid, 'fullName', off2."fullName", 'shortName', off2."shortName")
          ) AS "preparedOpr",

          COUNT(*) OVER() AS "totalCount"

        FROM tbl_transfer tr
        LEFT JOIN tbl_clients c ON c.guid = tr.client_guid
        LEFT JOIN tbl_employees op ON op.guid = tr.opr_guid
        LEFT JOIN tbl_offices off1 ON off1.guid = op.office_guid
        LEFT JOIN tbl_employees pop ON pop.guid = tr.prepared_opr_guid
        LEFT JOIN tbl_offices off2 ON off2.guid = pop.office_guid
        LEFT JOIN "tbl_TTP_payments" tp ON tp.transfer_guid = tr.guid

        WHERE 
          (:search::text IS NULL OR (
            c."fullName" ILIKE :search OR
            tr.destination_country ILIKE :search OR
            tr.route ILIKE :search OR
            tr.guests_count::text ILIKE :search
          ))
          AND (:application_date::date IS NULL OR tr.application_date::date = :application_date::date)
          AND (:opr_guid::uuid IS NULL OR tr.opr_guid = :opr_guid::uuid)
          AND (:prepared_opr_guid::uuid IS NULL OR tr.prepared_opr_guid = :prepared_opr_guid::uuid)
          AND (:transfer_type::text IS NULL OR tr.transfer_type = :transfer_type::text)
          AND (:machine_type::text IS NULL OR tr.machine_type = :machine_type::text)
          AND (:is_paid::integer IS NULL OR tr.is_paid = :is_paid::integer)
          AND (:system::text IS NULL OR tr.system = :system::text)

        GROUP BY tr.guid, c.guid, op.guid, off1.guid, pop.guid, off2.guid
        ORDER BY tr.index_number DESC
        LIMIT :limit OFFSET :offset;
      `;

      const rows: any[] = await this.sequelize.query(sqlQuery, {
        replacements,
        type: QueryTypes.SELECT,
      });

      const totalItems = rows.length > 0 ? Number(rows[0].totalCount) : 0;
      const cleanedRows = rows.map(({ totalCount, ...rest }) => rest);

      return {
        status: 200,
        data: cleanedRows,
        meta: {
          totalItems,
          totalPages: Math.ceil(totalItems / currentLimit),
          currentPage,
        },
        message: this.i18n.t('transfer.listFetched', { lang }),
      };
    } catch (error: any) {
      return errorResponse(
        HttpStatuses.INTERNAL_SERVER_ERROR,
        this.i18n.t('transfer.fetchFailed', { lang }),
        error,
      );
    }
  }



  async updateTransfer(updateDto: UpdateTransferDto, lang: string) {
    const t = await this.sequelize.transaction();
    try {
      const transfer = await this.transferRepository.findOne({
        where: { guid: updateDto.guid },
        transaction: t
      });

      if (!transfer) {
        await t.rollback();
        return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('transfer.notFound', { lang }));
      }

      const willBePaid = updateDto.is_paid === 1 || (transfer.is_paid === 1 && updateDto.is_paid !== 2);

      if (willBePaid) {
        const targetPrice = updateDto.price !== undefined ? Number(updateDto.price) : Number(transfer.price);
        const operatorGuid = updateDto.opr_guid || transfer.opr_guid;
        const payments = await this.ttpPaymentRepo.findAll({
          where: { transfer_guid: transfer.guid },
          order: [['index_number', 'ASC']],
          transaction: t
        });

        const currentTotalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
        const diff = Number((targetPrice - currentTotalPaid).toFixed(2));

        if (diff !== 0) {
          if (payments.length === 0) {
            if (targetPrice > 0) {
              await this.ttpPaymentRepo.create({
                transfer_guid: transfer.guid,
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

      await transfer.update(updateDto, { transaction: t });
      await t.commit();

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
      await t.rollback();
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('transfer.updateFailed', { lang }), error);
    }
  }

  async deleteTransfer(guid: string, lang: string) {
    const t = await this.sequelize.transaction();
    try {
      const transfer = await this.transferRepository.findByPk(guid, { transaction: t });
      if (!transfer) {
        await t.rollback();
        return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('transfer.notFound', { lang }));
      }
      await this.ttpPaymentRepo.destroy({ where: { transfer_guid: guid }, transaction: t });
      await transfer.destroy({ transaction: t });
      await t.commit();
      return successResponse(HttpStatuses.OK, null, this.i18n.t('transfer.deleted', { lang }));
    } catch (error: any) {
      await t.rollback();
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('transfer.deleteFailed', { lang }), error);
    }
  }
}