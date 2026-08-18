import { Injectable } from '@nestjs/common';
import { CreateHotelDto } from './dto/create-hotel.dto';
import { UpdateHotelDto } from './dto/update-hotel.dto';
import { InjectModel } from '@nestjs/sequelize';
import { Hotel } from './entities/hotel.entity';
import { Employee } from '../employee/entities/employee.entity';
import { Client } from '../client/entities/client.entity';
import { errorResponse, successResponse } from '../../helpers/responseFunctions';
import { HttpStatuses } from '../../helpers/httpStatuses.enum';
import { Office } from '../office/entities/office.entity';
import { Sequelize } from 'sequelize-typescript';
import { HarPayment } from '../har_payment/entities/har_payment.entity';
import { I18nService } from 'nestjs-i18n';
import { Op, QueryTypes } from 'sequelize';

@Injectable()
export class HotelService {
  constructor(
    @InjectModel(Hotel) private hotelRepository: typeof Hotel,
    @InjectModel(HarPayment) private harPaymentRepo: typeof HarPayment,
    private sequelize: Sequelize,
    private readonly i18n: I18nService,
  ) { }

  private getIncludes() {
    return [
      { model: Employee, as: 'operator', attributes: ['guid', 'fullName'], include: [{ model: Office, attributes: ['guid', 'fullName', 'shortName'] }] },
      { model: Employee, as: 'preparedOpr', attributes: ['guid', 'fullName'], include: [{ model: Office, attributes: ['guid', 'fullName', 'shortName'] }] },
      { model: Client, attributes: ['guid', 'fullName'] }
    ];
  }

  private getAttributes() {
    return {
      include: [
        [Sequelize.literal(`(SELECT ROUND(COALESCE(SUM(amount), 0)::numeric, 2) FROM "tbl_HAR_payments" AS hp WHERE hp.hotel_guid = "Hotel"."guid")`), 'totalPaid'],
        [Sequelize.literal(`(SELECT CASE WHEN SUM(hp.amount) IS NULL OR SUM(hp.amount) = 0 THEN '0%' WHEN "Hotel".price > 0 THEN CONCAT(ROUND(((SUM(hp.amount) / "Hotel".price) * 100)::numeric, 2), '%') ELSE '100%' END FROM "tbl_HAR_payments" AS hp WHERE hp.hotel_guid = "Hotel"."guid")`), 'paidPercentage']
      ]
    };
  }

  async addHotel(createDto: CreateHotelDto, lang: string) {
    const t = await this.sequelize.transaction();
    try {
      const hotel = await this.hotelRepository.create({ ...createDto } as any, { hooks: true, transaction: t });
      if ((createDto.is_paid === 1 || createDto.is_paid === 3) && (Number(hotel.price) || 0) > 0) {
        await this.harPaymentRepo.create({
          hotel_guid: hotel.guid,
          amount: Number(hotel.price) || 0,
          payment_date: new Date(),
          opr_guid: createDto.opr_guid || hotel.opr_guid
        } as any, { transaction: t });
      }
      await t.commit();
      const newHotel = await this.hotelRepository.findOne({
        where: { guid: hotel.guid },
        attributes: { exclude: ['opr_guid', 'client_guid', 'prepared_opr_guid'], include: this.getAttributes().include as any },
        include: this.getIncludes()
      });
      return { status: 201, data: newHotel, message: this.i18n.t('hotel.created', { lang }) };
    } catch (error: any) {
      await t.rollback();
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('hotel.createFailed', { lang }), error);
    }
  }



  async getAllHotel(
    page: number = 1,
    limit: number = 10,
    search?: string,
    application_date?: string,
    opr_guid?: string,
    prepared_opr_guid?: string,
    is_paid?: number,
    system?: string,
    meal_plan?: string,
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
        is_paid: is_paid !== undefined && is_paid !== null ? is_paid : null,
        system: system || null,
        meal_plan: meal_plan || null,
      };

      const sqlQuery = `
  SELECT 
    h.guid, h.index_number, h.application_date, h.destination_country, 
    h.hotel_name, h.room_type, h.meal_plan, h.guests_count, h.net_fare, 
    h.currency, h.price, h.profit, h.system, h.note, h.is_paid, h."createdAt", h."updatedAt",

    ROUND(COALESCE(SUM(hp.amount), 0)::numeric, 2) AS "totalPaid",
    CASE 
      WHEN COALESCE(SUM(hp.amount), 0) = 0 THEN '0%' 
      WHEN h.price > 0 THEN CONCAT(ROUND(((SUM(hp.amount) / h.price) * 100)::numeric, 2), '%') 
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

  FROM tbl_hotel h
  LEFT JOIN tbl_clients c ON c.guid = h.client_guid
  LEFT JOIN tbl_employees op ON op.guid = h.opr_guid
  LEFT JOIN tbl_offices off1 ON off1.guid = op.office_guid
  LEFT JOIN tbl_employees pop ON pop.guid = h.prepared_opr_guid
  LEFT JOIN tbl_offices off2 ON off2.guid = pop.office_guid
  LEFT JOIN "tbl_HAR_payments" hp ON hp.hotel_guid = h.guid

  WHERE 
    (:search::text IS NULL OR (
      c."fullName" ILIKE :search OR
      h.destination_country ILIKE :search OR
      h.hotel_name ILIKE :search OR
      h.room_type ILIKE :search OR
      h.guests_count::text ILIKE :search
    ))

    AND (:application_date::date IS NULL OR h.application_date::date = :application_date::date)
    AND (:opr_guid::uuid IS NULL OR h.opr_guid = :opr_guid::uuid)
    AND (:prepared_opr_guid::uuid IS NULL OR h.prepared_opr_guid = :prepared_opr_guid::uuid)
    AND (:is_paid::integer IS NULL OR h.is_paid = :is_paid::integer)
    AND (:system::text IS NULL OR h.system = :system::text)
    AND (:meal_plan::text IS NULL OR h.meal_plan = :meal_plan::text)

  GROUP BY h.guid, c.guid, op.guid, off1.guid, pop.guid, off2.guid
  ORDER BY h.index_number DESC
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
        message: this.i18n.t('hotel.listFetched', { lang }),
      };
    } catch (error: any) {
      return errorResponse(
        HttpStatuses.INTERNAL_SERVER_ERROR,
        this.i18n.t('hotel.fetchFailed', { lang }),
        error,
      );
    }
  }



  async updateHotel(updateDto: UpdateHotelDto, lang: string) {
    const t = await this.sequelize.transaction();
    try {
      const hotel = await this.hotelRepository.findOne({
        where: { guid: updateDto.guid },
        transaction: t
      });

      if (!hotel) {
        await t.rollback();
        return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('hotel.notFound', { lang }));
      }

      const targetPrice = updateDto.price !== undefined ? Number(updateDto.price) : Number(hotel.price);
      const operatorGuid = updateDto.opr_guid || hotel.opr_guid;

      if (updateDto.is_paid === 3) {
        await this.harPaymentRepo.destroy({
          where: { hotel_guid: hotel.guid },
          transaction: t
        });

        if (targetPrice > 0) {
          await this.harPaymentRepo.create({
            hotel_guid: hotel.guid,
            amount: targetPrice,
            payment_date: new Date(),
            opr_guid: operatorGuid
          } as any, { transaction: t });
        }
      } else {
        const willBePaid = updateDto.is_paid === 1 || (hotel.is_paid === 1 && updateDto.is_paid !== 2);

        if (willBePaid) {
          const payments = await this.harPaymentRepo.findAll({
            where: { hotel_guid: hotel.guid },
            order: [['index_number', 'ASC']],
            transaction: t
          });

          const currentTotalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
          const diff = Number((targetPrice - currentTotalPaid).toFixed(2));

          if (diff !== 0) {
            if (payments.length === 0) {
              if (targetPrice > 0) {
                await this.harPaymentRepo.create({
                  hotel_guid: hotel.guid,
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
      await hotel.update(updateDto, { transaction: t });
      await t.commit();

      const updatedHotel = await this.hotelRepository.findOne({
        where: { guid: updateDto.guid },
        attributes: {
          exclude: ['opr_guid', 'client_guid', 'prepared_opr_guid'],
          include: this.getAttributes().include as any
        },
        include: this.getIncludes()
      });

      return { status: 200, data: updatedHotel, message: this.i18n.t('hotel.updated', { lang }) };
    } catch (error: any) {
      await t.rollback();
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('hotel.updateFailed', { lang }), error);
    }
  }



  async deleteHotel(guid: string, lang: string) {
    const t = await this.sequelize.transaction();
    try {
      const hotel = await this.hotelRepository.findByPk(guid, { transaction: t });
      if (!hotel) {
        await t.rollback();
        return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('hotel.notFound', { lang }));
      }
      await this.harPaymentRepo.destroy({ where: { hotel_guid: guid }, transaction: t });
      await hotel.destroy({ transaction: t });
      await t.commit();
      return successResponse(HttpStatuses.OK, null, this.i18n.t('hotel.deleted', { lang }));
    } catch (error: any) {
      await t.rollback();
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('hotel.deleteFailed', { lang }), error);
    }
  }
}
