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

@Injectable()
export class TransferService {
  constructor(
    @InjectModel(Transfer) private transferRepository: typeof Transfer,
    @InjectModel(TtpPayment) private ttpPaymentRepo: typeof TtpPayment,
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

  async addTransfer(createDto: CreateTransferDto) {
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
      return { status: 201, data: newTransfer, message: 'Transfer created successfully' };
    } catch (error: any) {
      await t.rollback();
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Transfer creation failed', error);
    }
  }

  async getAllTransfer(page: number = 1, limit: number = 10) {
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
        message: 'Transfer records fetched successfully'
      };
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Transfer fetching error', error);
    }
  }

  async updateTransfer(updateDto: UpdateTransferDto) {
    try {
      const transfer = await this.transferRepository.findOne({
        where: { guid: updateDto.guid }
      });

      if (!transfer) {
        return errorResponse(HttpStatuses.NOT_FOUND, 'Transfer not found');
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

      return { status: 200, data: updatedTransfer, message: 'Transfer updated successfully' };
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Update failed', error);
    }
  }

  async deleteTransfer(guid: string) {
    try {
      const transfer = await this.transferRepository.findByPk(guid);
      if (!transfer) return errorResponse(HttpStatuses.NOT_FOUND, 'Transfer not found');
      await transfer.destroy();
      return successResponse(HttpStatuses.OK, null, 'Transfer deleted successfully');
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Deletion failed', error);
    }
  }
}