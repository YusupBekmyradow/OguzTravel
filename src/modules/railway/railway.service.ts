import { Injectable } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { CreateRailwayDto } from './dto/create-railway.dto';
import { UpdateRailwayDto } from './dto/update-railway.dto';
import { InjectModel } from '@nestjs/sequelize';
import { Railway } from './entities/railway.entity';
import { Employee } from '../employee/entities/employee.entity';
import { Office } from '../office/entities/office.entity';
import { Client } from '../client/entities/client.entity';
import { errorResponse, successResponse } from '../../helpers/responseFunctions';
import { HttpStatuses } from '../../helpers/httpStatuses.enum';
import { Sequelize } from 'sequelize-typescript';
import { HarPayment } from '../har_payment/entities/har_payment.entity';

@Injectable()
export class RailwayService {
  constructor(
    @InjectModel(Railway) private railwayRepository: typeof Railway,
    @InjectModel(HarPayment) private harPaymentRepo: typeof HarPayment,
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
            FROM "tbl_HAR_payments" AS hp
            WHERE hp.railway_guid = "Railway"."guid"
          )`),
          'totalPaid'
        ],
        [
          Sequelize.literal(`(
            SELECT 
              CASE 
                WHEN SUM(hp.amount) IS NULL OR SUM(hp.amount) = 0 THEN '0%'
                WHEN "Railway".price > 0 
                THEN CONCAT(ROUND(((SUM(hp.amount) / "Railway".price) * 100)::numeric, 2), '%')
                ELSE '100%' 
              END
            FROM "tbl_HAR_payments" AS hp
            WHERE hp.railway_guid = "Railway"."guid"
          )`),
          'paidPercentage'
        ]
      ]
    };
  }

  async addRailway(createDto: CreateRailwayDto, lang: string) {
    const t = await this.sequelize.transaction();
    try {
      const railway = await this.railwayRepository.create({ ...createDto } as any, { hooks: true, transaction: t });
      if (createDto.is_paid === true) {
        await this.harPaymentRepo.create({
          railway_guid: railway.guid,
          amount: railway.price || 0,
          payment_date: new Date(),
          opr_guid: createDto.opr_guid
        } as any, { transaction: t });
      }
      await t.commit();

      const newRailway = await this.railwayRepository.findOne({
        where: { guid: railway.guid },
        attributes: {
          exclude: ['opr_guid', 'client_guid', 'prepared_opr_guid'],
          include: this.getAttributes().include as any
        },
        include: this.getIncludes()
      });

      return { status: 201, data: newRailway, message: 'Railway record has been created successfully' };
    } catch (error: any) {
      await t.rollback();
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Failed to create the railway record. Please try again later.', error);
    }
  }

  async getAllRailway(page: number = 1, limit: number = 10, lang: string = 'tk') {
    try {
      const currentPage = Math.max(1, Number(page));
      const currentLimit = Math.max(1, Number(limit));
      const offset = (currentPage - 1) * currentLimit;

      const { rows, count } = await this.railwayRepository.findAndCountAll({
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
        message: this.i18n.t('railway.listFetched', { lang })
      };
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('railway.fetchFailed', { lang }), error);
    }
  }


  async updateRailway(updateDto: UpdateRailwayDto, lang: string) {
    try {
      const railway = await this.railwayRepository.findOne({
        where: { guid: updateDto.guid }
      });

      if (!railway) {
        return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('railway.notFound', { lang }));
      }
      await railway.update(updateDto);
      const updatedRailway = await this.railwayRepository.findOne({
        where: { guid: updateDto.guid },
        attributes: {
          exclude: ['opr_guid', 'client_guid', 'prepared_opr_guid'],
          include: this.getAttributes().include as any
        },
        include: this.getIncludes()
      });

      return { status: 200, data: updatedRailway, message: this.i18n.t('railway.updated', { lang }) };
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('railway.updateFailed', { lang }), error);
    }
  }


  async deleteRailway(guid: string, lang: string) {
    try {
      const railway = await this.railwayRepository.findByPk(guid);
      if (!railway) return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('railway.notFound', { lang }));
      await railway.destroy();
      return successResponse(HttpStatuses.OK, null, this.i18n.t('railway.deleted', { lang }));
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('railway.deleteFailed', { lang }), error);
    }
  }
}




