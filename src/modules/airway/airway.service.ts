import { Injectable, OnModuleInit } from '@nestjs/common';
import { CreateAirwayDto } from './dto/create-airway.dto';
import { UpdateAirwayDto } from './dto/update-airway.dto';
import { InjectModel } from '@nestjs/sequelize';
import { Airway } from './entities/airway.entity';
import { Employee } from '../employee/entities/employee.entity';
import { errorResponse, successResponse } from '../../helpers/responseFunctions';
import { HttpStatuses } from '../../helpers/httpStatuses.enum';
import { Office } from '../office/entities/office.entity';
import { Sequelize } from 'sequelize-typescript';
import { HarPayment } from '../har_payment/entities/har_payment.entity';
import { I18nService } from 'nestjs-i18n';
import { QueryTypes } from 'sequelize';

@Injectable()
export class AirwayService implements OnModuleInit {
  constructor(
    @InjectModel(Airway) private airwayRepository: typeof Airway,
    @InjectModel(HarPayment) private harPaymentRepo: typeof HarPayment,
    private sequelize: Sequelize,
    private readonly i18n: I18nService,
  ) { }

  async onModuleInit() {
    try {
      await this.sequelize.query(`
        ALTER TABLE "tbl_airway" 
        ADD COLUMN IF NOT EXISTS "client_name" VARCHAR(255);

        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'tbl_airway' AND column_name = 'client_guid'
          ) THEN
            UPDATE "tbl_airway" AS a
            SET "client_name" = c."fullName"
            FROM "tbl_clients" AS c
            WHERE a."client_guid" = c."guid"
              AND a."client_guid" IS NOT NULL
              AND (a."client_name" IS NULL OR a."client_name" = '');
          END IF;
        END $$;
      `);
    } catch (e) {
    }
  }

  private getIncludes() {
    return [
      { model: Employee, as: 'operator', attributes: ['guid', 'fullName'], include: [{ model: Office, attributes: ['guid', 'fullName', 'shortName'] }] },
      { model: Employee, as: 'preparedOpr', attributes: ['guid', 'fullName'], include: [{ model: Office, attributes: ['guid', 'fullName', 'shortName'] }] },
    ];
  }

  private getAttributes() {
    return {
      include: [
        [Sequelize.literal(`(SELECT ROUND(COALESCE(SUM(amount), 0)::numeric, 2) FROM "tbl_HAR_payments" AS hp WHERE hp.airway_guid = "Airway"."guid")`), 'totalPaid'],
        [Sequelize.literal(`(SELECT CASE WHEN SUM(hp.amount) IS NULL OR SUM(hp.amount) = 0 THEN '0%' WHEN "Airway".price > 0 THEN CONCAT(ROUND(((SUM(hp.amount) / "Airway".price) * 100)::numeric, 2), '%') ELSE '100%' END FROM "tbl_HAR_payments" AS hp WHERE hp.airway_guid = "Airway"."guid")`), 'paidPercentage']
      ]
    };
  }

  async addAirway(createDto: CreateAirwayDto, lang: string) {
    const t = await this.sequelize.transaction();
    try {
      const airway = await this.airwayRepository.create({ ...createDto } as any, { hooks: true, transaction: t });
      if ((createDto.is_paid === 1 || createDto.is_paid === 3) && (Number(airway.price) || 0) > 0) {
        await this.harPaymentRepo.create({
          airway_guid: airway.guid,
          amount: Number(airway.price) || 0,
          payment_date: new Date(),
          opr_guid: createDto.opr_guid || airway.opr_guid
        } as any, { transaction: t });
      }
      await t.commit();
      const newAirway = await this.airwayRepository.findOne({
        where: { guid: airway.guid },
        attributes: { exclude: ['opr_guid', 'prepared_opr_guid'], include: this.getAttributes().include as any },
        include: this.getIncludes()
      });
      return { status: 201, data: newAirway, message: this.i18n.t('airway.created', { lang }) };
    } catch (error: any) {
      await t.rollback();
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('airway.createFailed', { lang }), error);
    }
  }



  private parseStartDate(date?: string | Date): string | null {
    if (!date) return null;
    if (typeof date === 'string') {
      const trimmed = date.trim();
      if (!trimmed) return null;
      if (/^\d{4}$/.test(trimmed)) {
        return `${trimmed}-01-01`;
      }
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        return trimmed;
      }
    }
    const d = new Date(date);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().split('T')[0];
  }

  private parseEndDate(date?: string | Date): string | null {
    if (!date) return null;
    if (typeof date === 'string') {
      const trimmed = date.trim();
      if (!trimmed) return null;
      if (/^\d{4}$/.test(trimmed)) {
        return `${trimmed}-12-31`;
      }
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        return trimmed;
      }
    }
    const d = new Date(date);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().split('T')[0];
  }

  async getAllAirway(
    page: number = 1,
    limit: number = 10,
    search?: string,
    start_date?: string,
    end_date?: string,
    opr_guid?: string,
    prepared_opr_guid?: string,
    is_paid?: number,
    system?: string,
    ticket_type?: string,
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
        start_date: this.parseStartDate(start_date),
        end_date: this.parseEndDate(end_date),
        opr_guid: opr_guid || null,
        prepared_opr_guid: prepared_opr_guid || null,
        is_paid: is_paid !== undefined && is_paid !== null ? is_paid : null,
        system: system || null,
        ticket_type: ticket_type || null,
      };

      const sqlQuery = `
      SELECT 
        a.guid, a.index_number, a.application_date, a.ticket_number, 
        a.ticket_type, a.destination_country, a.route, a.passenger_count, 
        a.net_fare, a.currency, a.price, a.profit, a.system, a.note, 
        a.is_paid, a."createdAt", a."updatedAt",
        a.client_name,

        ROUND(COALESCE(SUM(hp.amount), 0)::numeric, 2) AS "totalPaid",
        CASE 
          WHEN COALESCE(SUM(hp.amount), 0) = 0 THEN '0%' 
          WHEN a.price > 0 THEN CONCAT(ROUND(((SUM(hp.amount) / a.price) * 100)::numeric, 2), '%') 
          ELSE '100%' 
        END AS "paidPercentage",

        JSON_BUILD_OBJECT(
          'guid', op.guid, 'fullName', op."fullName",
          'office', JSON_BUILD_OBJECT('guid', off1.guid, 'fullName', off1."fullName", 'shortName', off1."shortName")
        ) AS operator,
        JSON_BUILD_OBJECT(
          'guid', pop.guid, 'fullName', pop."fullName",
          'office', JSON_BUILD_OBJECT('guid', off2.guid, 'fullName', off2."fullName", 'shortName', off2."shortName")
        ) AS "preparedOpr",

        COUNT(*) OVER() AS "totalCount"

      FROM tbl_airway a
      LEFT JOIN tbl_employees op ON op.guid = a.opr_guid
      LEFT JOIN tbl_offices off1 ON off1.guid = op.office_guid
      LEFT JOIN tbl_employees pop ON pop.guid = a.prepared_opr_guid
      LEFT JOIN tbl_offices off2 ON off2.guid = pop.office_guid
      LEFT JOIN "tbl_HAR_payments" hp ON hp.airway_guid = a.guid

      WHERE 

        (:search::text IS NULL OR (
          a.client_name ILIKE :search OR
          a.ticket_number ILIKE :search OR
          a.destination_country ILIKE :search OR
          a.route ILIKE :search OR
          a.passenger_count::text ILIKE :search
        ))


        AND (:start_date::date IS NULL OR (a.application_date AT TIME ZONE 'Asia/Ashgabat')::date >= :start_date::date)
        AND (:end_date::date IS NULL OR (a.application_date AT TIME ZONE 'Asia/Ashgabat')::date <= :end_date::date)
        AND (:opr_guid::uuid IS NULL OR a.opr_guid = :opr_guid::uuid)
        AND (:prepared_opr_guid::uuid IS NULL OR a.prepared_opr_guid = :prepared_opr_guid::uuid)
        AND (:is_paid::integer IS NULL OR a.is_paid = :is_paid::integer)
        AND (:system::text IS NULL OR a.system = :system::text)
        AND (:ticket_type::text IS NULL OR a.ticket_type = :ticket_type::text)

      GROUP BY a.guid, op.guid, off1.guid, pop.guid, off2.guid
      ORDER BY a.index_number DESC
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
        message: this.i18n.t('airway.listFetched', { lang }),
      };
    } catch (error: any) {
      return errorResponse(
        HttpStatuses.INTERNAL_SERVER_ERROR,
        this.i18n.t('airway.fetchFailed', { lang }),
        error,
      );
    }
  }




  async updateAirway(updateDto: UpdateAirwayDto, lang: string) {
    const t = await this.sequelize.transaction();
    try {
      const airway = await this.airwayRepository.findOne({
        where: { guid: updateDto.guid },
        transaction: t
      });

      if (!airway) {
        await t.rollback();
        return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('airway.notFound', { lang }));
      }

      const targetPrice = updateDto.price !== undefined ? Number(updateDto.price) : Number(airway.price);
      const operatorGuid = updateDto.opr_guid || airway.opr_guid;

      if (updateDto.is_paid === 3) {
        await this.harPaymentRepo.destroy({
          where: { airway_guid: airway.guid },
          transaction: t
        });

        if (targetPrice > 0) {
          await this.harPaymentRepo.create({
            airway_guid: airway.guid,
            amount: targetPrice,
            payment_date: new Date(),
            opr_guid: operatorGuid
          } as any, { transaction: t });
        }
      } else {
        const willBePaid = updateDto.is_paid === 1 || (airway.is_paid === 1 && updateDto.is_paid !== 2);

        if (willBePaid) {
          const payments = await this.harPaymentRepo.findAll({
            where: { airway_guid: airway.guid },
            order: [['index_number', 'ASC']],
            transaction: t
          });

          const currentTotalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
          const diff = Number((targetPrice - currentTotalPaid).toFixed(2));

          if (diff !== 0) {
            if (payments.length === 0) {
              if (targetPrice > 0) {
                await this.harPaymentRepo.create({
                  airway_guid: airway.guid,
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

      await airway.update(updateDto, { transaction: t });
      await t.commit();

      const updatedAirway = await this.airwayRepository.findOne({
        where: { guid: updateDto.guid },
        attributes: {
          exclude: ['opr_guid', 'prepared_opr_guid'],
          include: this.getAttributes().include as any
        },
        include: this.getIncludes()
      });

      return { status: 200, data: updatedAirway, message: this.i18n.t('airway.updated', { lang }) };
    } catch (error: any) {
      await t.rollback();
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('airway.updateFailed', { lang }), error);
    }
  }

  async deleteAirway(guid: string, lang: string) {
    const t = await this.sequelize.transaction();
    try {
      const airway = await this.airwayRepository.findByPk(guid, { transaction: t });
      if (!airway) {
        await t.rollback();
        return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('airway.notFound', { lang }));
      }
      await this.harPaymentRepo.destroy({ where: { airway_guid: guid }, transaction: t });
      await airway.destroy({ transaction: t });
      await t.commit();
      return successResponse(HttpStatuses.OK, null, this.i18n.t('airway.deleted', { lang }));
    } catch (error: any) {
      await t.rollback();
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('airway.deleteFailed', { lang }), error);
    }
  }
}
