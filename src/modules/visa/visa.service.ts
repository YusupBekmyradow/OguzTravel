import { Injectable } from '@nestjs/common';
import { CreateVisaDto } from './dto/create-visa.dto';
import { UpdateVisaDto } from './dto/update-visa.dto';
import { InjectModel } from '@nestjs/sequelize';
import { Visa } from './entities/visa.entity';
import { Client } from '../client/entities/client.entity';
import { errorResponse, successResponse } from '../../helpers/responseFunctions';
import { HttpStatuses } from '../../helpers/httpStatuses.enum';
import { Employee } from '../employee/entities/employee.entity';
import { Office } from '../office/entities/office.entity';
import { I18nService } from 'nestjs-i18n';
import { Sequelize } from 'sequelize-typescript';
import { VisaPayment } from '../visa_payment/entities/visa_payment.entity';
import { QueryTypes } from 'sequelize';

@Injectable()
export class VisaService {
  constructor(
    @InjectModel(Visa) private visaRepository: typeof Visa,
    @InjectModel(Client) private clientRepository: typeof Client,
    @InjectModel(VisaPayment) private visaPaymentRepo: typeof VisaPayment,
    private sequelize: Sequelize,
    private readonly i18n: I18nService,
  ) { }

  private getVisaIncludes() {
    return [
      {
        model: Employee, as: 'receiveroperator', attributes: ['guid', 'fullName'],
        include: [{ model: Office, attributes: ['guid', 'fullName', 'shortName'] }]
      },
      {
        model: Client,
        attributes: ['guid', 'fullName', 'phone_number', 'passport_number',
          'passportExpiryDate', 'passportCountryOfIssue', 'dateOfBirth',
          'passport_count', 'passportHistory']
      },
      {
        model: VisaPayment,
        attributes: ['guid', 'amount', 'currency', 'payment_date', 'note', 'index_number', 'createdAt'],
        include: [{ model: Employee, as: 'visaoperator', attributes: ['guid', 'fullName'] }],
        required: false,
      }
    ];
  }

  private getVisaAttributes() {
    return {
      include: [
        [
          Sequelize.literal(`(
            SELECT ROUND(COALESCE(SUM(CASE WHEN vp.currency = 'TMT' THEN vp.amount ELSE 0 END), 0)::numeric, 2)
            FROM tbl_visa_payments AS vp
            WHERE vp.visa_guid = "Visa"."guid"
          )`),
          'totalPaidTmt'
        ],
        [
          Sequelize.literal(`(
            SELECT ROUND(COALESCE(SUM(CASE WHEN vp.currency = 'USD' THEN vp.amount ELSE 0 END), 0)::numeric, 2)
            FROM tbl_visa_payments AS vp
            WHERE vp.visa_guid = "Visa"."guid"
          )`),
          'totalPaidUsd'
        ],
        [
          Sequelize.literal(`(
            SELECT
              CASE
                WHEN "Visa".price_tmt IS NULL OR "Visa".price_tmt = 0 THEN '0%'
                ELSE CONCAT(
                  ROUND((
                    COALESCE((
                      SELECT SUM(vp.amount)
                      FROM tbl_visa_payments AS vp
                      WHERE vp.visa_guid = "Visa"."guid" AND vp.currency = 'TMT'
                    ), 0) / "Visa".price_tmt * 100
                  )::numeric, 2),
                  '%'
                )
              END
          )`),
          'paidPercentageTmt'
        ],
        [
          Sequelize.literal(`(
            SELECT
              CASE
                WHEN "Visa".price_usd IS NULL OR "Visa".price_usd = 0 THEN '0%'
                ELSE CONCAT(
                  ROUND((
                    COALESCE((
                      SELECT SUM(vp.amount)
                      FROM tbl_visa_payments AS vp
                      WHERE vp.visa_guid = "Visa"."guid" AND vp.currency = 'USD'
                    ), 0) / "Visa".price_usd * 100
                  )::numeric, 2),
                  '%'
                )
              END
          )`),
          'paidPercentageUsd'
        ],
      ]
    };
  }

  private formatVisaPassport(visa: any) {
    if (!visa || !visa.client) return visa;
    const visaJson = visa.toJSON ? visa.toJSON() : visa;
    const client = visaJson.client;
    if (visaJson.passport_count && client.passport_count && visaJson.passport_count !== client.passport_count) {
      if (Array.isArray(client.passportHistory)) {
        const oldPassport = client.passportHistory.find((p: any) => p.passport_count === visaJson.passport_count);
        if (oldPassport) {
          client.passport_number = oldPassport.passport_number;
          client.passportExpiryDate = oldPassport.passportExpiryDate;
          client.passportCountryOfIssue = oldPassport.passportCountryOfIssue;
        }
      }
    }
    delete client.passportHistory;
    return visaJson;
  }

  private async getVisaPaymentStats(visa_guid: string) {
    const stats = await this.sequelize.query(`
      SELECT
        v.price_tmt            AS "total_sales_tmt",
        v.price_usd            AS "total_sales_usd",
        COALESCE(SUM(CASE WHEN vp.currency = 'TMT' THEN vp.amount ELSE 0 END), 0) AS "paid_tmt",
        COALESCE(SUM(CASE WHEN vp.currency = 'USD' THEN vp.amount ELSE 0 END), 0) AS "paid_usd"
      FROM tbl_visa v
      LEFT JOIN tbl_visa_payments vp ON v.guid = vp.visa_guid
      WHERE v.guid = :visa_guid
      GROUP BY v.guid, v.price_tmt, v.price_usd
    `, { replacements: { visa_guid }, type: QueryTypes.SELECT });

    const row: any = stats[0] || { total_sales_tmt: 0, total_sales_usd: 0, paid_tmt: 0, paid_usd: 0 };

    const tmtTotal = Number(row.total_sales_tmt);
    const usdTotal = Number(row.total_sales_usd);
    const tmtPaid = Number(row.paid_tmt);
    const usdPaid = Number(row.paid_usd);

    return {
      TMT: { total_sales: tmtTotal, total_paid: tmtPaid, remaining: Number((tmtTotal - tmtPaid).toFixed(2)) },
      USD: { total_sales: usdTotal, total_paid: usdPaid, remaining: Number((usdTotal - usdPaid).toFixed(2)) },
    };
  }

  async addVisa(createVisaDto: CreateVisaDto, lang: string) {
    const t = await this.sequelize.transaction();
    try {
      const client = await this.clientRepository.findByPk(createVisaDto.client_guid, { transaction: t });
      if (!client) {
        await t.rollback();
        return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('visa.clientNotFound', { lang }));
      }

      const isPaidTrue = createVisaDto.is_paid === true || (createVisaDto.is_paid as any) === 'true';
      const isStatusRefund = Number(createVisaDto.status) === 3;
      const finalIsPaid = isStatusRefund ? true : isPaidTrue;

      const visa = await this.visaRepository.create(
        {
          ...createVisaDto,
          is_paid: finalIsPaid,
          passport_count: client.passport_count || 1
        } as any,
        { transaction: t }
      );
      if (isPaidTrue || isStatusRefund) {
        if (Number(createVisaDto.price_tmt) > 0) {
          await this.visaPaymentRepo.create({
            visa_guid: visa.guid,
            amount: Number(createVisaDto.price_tmt),
            currency: 'TMT',
            payment_date: new Date(),
            opr_guid: createVisaDto.receiver_opr_guid,
          } as any, { transaction: t });
        }
        if (Number(createVisaDto.price_usd) > 0) {
          await this.visaPaymentRepo.create({
            visa_guid: visa.guid,
            amount: Number(createVisaDto.price_usd),
            currency: 'USD',
            payment_date: new Date(),
            opr_guid: createVisaDto.receiver_opr_guid,
          } as any, { transaction: t });
        }
      }

      await t.commit();

      const newVisa = await this.visaRepository.findOne({
        where: { guid: visa.guid },
        attributes: { exclude: ['package_guid', 'service_guid', 'hotel_booking_guid', 'translation_guid', 'courier_guid'], include: this.getVisaAttributes().include as any },
        include: this.getVisaIncludes(),
      });
      if (!newVisa) return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('visa.notFoundAfterCreate', { lang }));

      const paymentStats = await this.getVisaPaymentStats(visa.guid);
      return {
        status: 201,
        data: { ...this.formatVisaPassport(newVisa), paymentStats },
        message: this.i18n.t('visa.created', { lang })
      };
    } catch (error: any) {
      await t.rollback();
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('visa.createFailed', { lang }), error);
    }
  }

  async getAllVisa(page: number = 1, limit: number = 10, lang: string = 'tk') {
    try {
      const currentPage = Math.max(1, Number(page));
      const currentLimit = Math.max(1, Number(limit));
      const offset = (currentPage - 1) * currentLimit;

      const { rows, count } = await this.visaRepository.findAndCountAll({
        attributes: {
          exclude: ['package_guid', 'service_guid', 'hotel_booking_guid', 'translation_guid', 'courier_guid'],
          include: this.getVisaAttributes().include as any
        },
        include: this.getVisaIncludes(),
        order: [['createdAt', 'DESC']],
        limit: currentLimit,
        offset,
      });

      return {
        status: 200,
        data: rows.map(r => this.formatVisaPassport(r)),
        meta: { totalItems: count, totalPages: Math.ceil(count / currentLimit), currentPage },
        message: this.i18n.t('visa.listFetched', { lang })
      };
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('visa.fetchFailed', { lang }), error);
    }
  }

  async updateVisa(updateDto: UpdateVisaDto, lang: string) {
    const t = await this.sequelize.transaction();
    try {
      const existingVisa = await this.visaRepository.findByPk(updateDto.guid, { transaction: t });
      if (!existingVisa) {
        await t.rollback();
        return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('visa.notFound', { lang }));
      }

      const operatorGuid = updateDto.receiver_opr_guid || existingVisa.receiver_opr_guid;
      const newPriceTmt = updateDto.price_tmt !== undefined ? Number(updateDto.price_tmt) : Number(existingVisa.price_tmt);
      const newPriceUsd = updateDto.price_usd !== undefined ? Number(updateDto.price_usd) : Number(existingVisa.price_usd);
      const newStatus = updateDto.status !== undefined ? Number(updateDto.status) : Number(existingVisa.status);

      const isPaidTrue = updateDto.is_paid === true || (updateDto.is_paid as any) === 'true';
      const isPaidFalse = updateDto.is_paid === false || (updateDto.is_paid as any) === 'false';
      const isStatusRefund = newStatus === 3;

      let updateData: any = { ...updateDto };

      if (isStatusRefund) {
        // Status 3 (Gaýtarylan / Refund) bolanda:
        // 1. Öňki bar bolan ähli tölegleri arassalaýarys
        await this.visaPaymentRepo.destroy({
          where: { visa_guid: existingVisa.guid },
          transaction: t
        });

        // 2. Doly baha möçberinde täze tölegler ýazylýar (Airway / Railway / B2B ýaly)
        if (newPriceTmt > 0) {
          await this.visaPaymentRepo.create({
            visa_guid: existingVisa.guid,
            amount: newPriceTmt,
            currency: 'TMT',
            payment_date: new Date(),
            opr_guid: operatorGuid,
          } as any, { transaction: t });
        }
        if (newPriceUsd > 0) {
          await this.visaPaymentRepo.create({
            visa_guid: existingVisa.guid,
            amount: newPriceUsd,
            currency: 'USD',
            payment_date: new Date(),
            opr_guid: operatorGuid,
          } as any, { transaction: t });
        }

        updateData.is_paid = true;
      } else {
        // Status 3 däl bolanda:
        const willBePaid = isPaidTrue || (existingVisa.is_paid === true && !isPaidFalse);

        if (willBePaid) {
          // Tölenen (is_paid === true)
          for (const { currency, targetPrice } of [
            { currency: 'TMT', targetPrice: newPriceTmt },
            { currency: 'USD', targetPrice: newPriceUsd },
          ]) {
            const payments = await this.visaPaymentRepo.findAll({
              where: { visa_guid: existingVisa.guid, currency },
              order: [['index_number', 'ASC']],
              transaction: t,
            });

            if (targetPrice <= 0) {
              if (payments.length > 0) {
                await this.visaPaymentRepo.destroy({
                  where: { visa_guid: existingVisa.guid, currency },
                  transaction: t,
                });
              }
              continue;
            }

            const currentTotalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
            const diff = Number((targetPrice - currentTotalPaid).toFixed(2));

            if (diff !== 0) {
              if (payments.length === 0) {
                await this.visaPaymentRepo.create({
                  visa_guid: existingVisa.guid,
                  amount: targetPrice,
                  currency,
                  payment_date: new Date(),
                  opr_guid: operatorGuid,
                } as any, { transaction: t });
              } else if (payments.length === 1) {
                await payments[0].update({
                  amount: targetPrice,
                  opr_guid: operatorGuid || payments[0].opr_guid
                }, { transaction: t });
              } else if (diff > 0) {
                const last = payments[payments.length - 1];
                await last.update({
                  amount: Number((Number(last.amount) + diff).toFixed(2)),
                  opr_guid: operatorGuid || last.opr_guid
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
                    await p.update({
                      amount: Math.max(0, Number((pAmount - amountToReduce).toFixed(2))),
                      opr_guid: operatorGuid || p.opr_guid
                    }, { transaction: t });
                    amountToReduce = 0;
                  }
                }
              }
            }
          }
          updateData.is_paid = true;
        } else if (isPaidFalse) {
          // Kredit (is_paid === false)
          // Eger öň status 3 (Gaýtarylan) bolup, indi status 3-den kredite geçirilýän bolsa,
          // gaýtarylan wagty ýazylan awtomatiki tölegi aýyrmaly
          if (Number(existingVisa.status) === 3) {
            await this.visaPaymentRepo.destroy({
              where: { visa_guid: existingVisa.guid },
              transaction: t,
            });
          }
          updateData.is_paid = false;
        }
      }

      if (updateDto.client_guid && updateDto.client_guid !== existingVisa.client_guid) {
        const client = await this.clientRepository.findByPk(updateDto.client_guid, { transaction: t });
        if (client) updateData.passport_count = client.passport_count || 1;
      } else {
        updateData.passport_count = existingVisa.passport_count;
      }

      await this.visaRepository.update(updateData, { where: { guid: updateDto.guid }, transaction: t });
      await t.commit();

      const updatedVisa = await this.visaRepository.findOne({
        where: { guid: updateDto.guid },
        attributes: {
          exclude: ['package_guid', 'service_guid', 'hotel_booking_guid', 'translation_guid', 'courier_guid'],
          include: this.getVisaAttributes().include as any
        },
        include: this.getVisaIncludes(),
      });

      const paymentStats = await this.getVisaPaymentStats(updateDto.guid);
      return {
        status: 200,
        data: { ...this.formatVisaPassport(updatedVisa), paymentStats },
        message: this.i18n.t('visa.updated', { lang })
      };
    } catch (error: any) {
      console.log(error)
      await t.rollback();
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('visa.updateFailed', { lang }), error);
    }
  }


  async deleteVisa(guid: string, lang: string) {
    const t = await this.sequelize.transaction();
    try {
      const visa = await this.visaRepository.findByPk(guid, { transaction: t });
      if (!visa) {
        await t.rollback();
        return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('visa.notFound', { lang }));
      }
      await this.visaPaymentRepo.destroy({ where: { visa_guid: guid }, transaction: t });
      await visa.destroy({ transaction: t });
      await t.commit();
      return successResponse(HttpStatuses.OK, null, this.i18n.t('visa.deleted', { lang }));
    } catch (error: any) {
      await t.rollback();
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('visa.deleteFailed', { lang }), error);
    }
  }
}
