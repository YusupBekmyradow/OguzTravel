import { Injectable } from '@nestjs/common';
import { CreateAirwayDto } from './dto/create-airway.dto';
import { UpdateAirwayDto } from './dto/update-airway.dto';
import { InjectModel } from '@nestjs/sequelize';
import { Airway } from './entities/airway.entity';
import { Employee } from '../employee/entities/employee.entity';
import { Client } from '../client/entities/client.entity';
import { errorResponse, successResponse } from '../../helpers/responseFunctions';
import { HttpStatuses } from '../../helpers/httpStatuses.enum';
import { Office } from '../office/entities/office.entity';
import { Sequelize } from 'sequelize-typescript';
import { HarPayment } from '../har_payment/entities/har_payment.entity';

@Injectable()
export class AirwayService {
  constructor(
    @InjectModel(Airway) private airwayRepository: typeof Airway,
    @InjectModel(HarPayment) private harPaymentRepo: typeof HarPayment,
    private sequelize: Sequelize,
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
            WHERE hp.airway_guid = "Airway"."guid"
          )`),
          'totalPaid'
        ],
        [
          Sequelize.literal(`(
            SELECT 
              CASE 
                WHEN SUM(hp.amount) IS NULL OR SUM(hp.amount) = 0 THEN '0%'
                WHEN "Airway".price > 0 
                THEN CONCAT(ROUND(((SUM(hp.amount) / "Airway".price) * 100)::numeric, 2), '%')
                ELSE '100%' 
              END
            FROM "tbl_HAR_payments" AS hp
            WHERE hp.airway_guid = "Airway"."guid"
          )`),
          'paidPercentage'
        ]
      ]
    };
  }

  async addAirway(createDto: CreateAirwayDto) {
    const t = await this.sequelize.transaction();
    try {
      const airway = await this.airwayRepository.create({ ...createDto } as any, { hooks: true, transaction: t });
      if (createDto.is_paid === true) {
        await this.harPaymentRepo.create({
          airway_guid: airway.guid,
          amount: airway.price || 0,
          payment_date: new Date(),
          opr_guid: createDto.opr_guid
        } as any, { transaction: t });
      }
      await t.commit();
      const newAirway = await this.airwayRepository.findOne({
        where: { guid: airway.guid },
        attributes: {
          exclude: ['opr_guid', 'client_guid', 'prepared_opr_guid'],
          include: this.getAttributes().include as any
        },
        include: this.getIncludes()
      });
      return { status: 201, data: newAirway, message: 'Airway created successfully' };
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Airway creation failed', error);
    }
  }

  async getAllAirway(page: number = 1, limit: number = 10) {
    try {
      const currentPage = Math.max(1, Number(page));
      const currentLimit = Math.max(1, Number(limit));
      const offset = (currentPage - 1) * currentLimit;

      const { rows, count } = await this.airwayRepository.findAndCountAll({
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
        message: 'Airway records fetched successfully'
      };
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Airway fetching error', error);
    }
  }


  async updateAirway(updateDto: UpdateAirwayDto) {
    try {
      const airway = await this.airwayRepository.findOne({
        where: { guid: updateDto.guid }
      });

      if (!airway) {
        return errorResponse(HttpStatuses.NOT_FOUND, 'Airway not found');
      }
      await airway.update(updateDto);

      const updatedAirway = await this.airwayRepository.findOne({
        where: { guid: updateDto.guid },
        attributes: {
          exclude: ['opr_guid', 'client_guid', 'prepared_opr_guid'],
          include: this.getAttributes().include as any
        },
        include: this.getIncludes()
      });

      return { status: 200, data: updatedAirway, message: 'Airway updated successfully' };
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Update failed', error);
    }
  }

  async deleteAirway(guid: string) {
    try {
      const airway = await this.airwayRepository.findByPk(guid);
      if (!airway) return errorResponse(HttpStatuses.NOT_FOUND, 'Airway not found');

      await airway.destroy();
      return successResponse(HttpStatuses.OK, null, 'Airway deleted successfully');
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Deletion failed', error);
    }
  }
}