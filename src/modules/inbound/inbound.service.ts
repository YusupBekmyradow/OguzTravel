import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Inbound } from './entities/inbound.entity';
import { Employee } from '../employee/entities/employee.entity';
import { Client } from '../client/entities/client.entity';
import { CreateInboundDto } from './dto/create-inbound.dto';
import { UpdateInboundDto } from './dto/update-inbound.dto';
import { errorResponse, successResponse } from '../../helpers/responseFunctions';
import { HttpStatuses } from '../../helpers/httpStatuses.enum';
import { Sequelize } from 'sequelize-typescript';
import { Office } from '../office/entities/office.entity';
import { QueryTypes } from 'sequelize';

@Injectable()
export class InboundService {
  constructor(
    @InjectModel(Inbound) private inboundRepository: typeof Inbound,
    private sequelize: Sequelize,
  ) { }

  private getIncludes() {
    return [
      {
        model: Employee, attributes: ['guid', 'fullName'],
        include: [{ model: Office, attributes: ['guid', 'fullName', 'shortName'] }]
      },
      { model: Client, attributes: ['guid', 'fullName', 'phone_number'] },
    ];
  }


  private async getInboundPaymentStats(inbound_guid: string) {
    const stats = await this.sequelize.query(`
      SELECT 
        COALESCE(SUM(CASE WHEN currency = 'TMT' THEN amount ELSE 0 END), 0) as "paid_tmt",
        COALESCE(SUM(CASE WHEN currency = 'USD' THEN amount ELSE 0 END), 0) as "paid_usd"
      FROM tbl_visa_payments
      WHERE inbound_guid = :inbound_guid
    `, {
      replacements: { inbound_guid },
      type: QueryTypes.SELECT
    });
    const row = (stats[0] as any) || { paid_tmt: 0, paid_usd: 0 };
    return {
      TMT: {
        total_paid: Number(row.paid_tmt)
      },
      USD: {
        total_paid: Number(row.paid_usd)
      }
    };
  }


  async addInbound(createDto: CreateInboundDto) {
    try {
      const inbound = await this.inboundRepository.create({
        ...createDto,
      } as any);

      const newInbound = await this.inboundRepository.findOne({
        where: { guid: inbound.guid },
        include: this.getIncludes(),
      });
      if (!newInbound) {
        return errorResponse(HttpStatuses.NOT_FOUND, 'Inbound not found');
      }
      const stats = await this.getInboundPaymentStats(newInbound.guid);
      const combinedData = {
        ...newInbound.toJSON(),
        credit_payments: stats,
      };
      return { status: 201, data: combinedData, message: 'Inbound created successfully' };
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Inbound creation failed', error);
    }
  }


  async getAllInbound(page: number = 1, limit: number = 10) {
    try {
      const currentPage = Math.max(1, Number(page));
      const currentLimit = Math.max(1, Number(limit));
      const offset = (currentPage - 1) * currentLimit;

      const { rows, count } = await this.inboundRepository.findAndCountAll({
        include: this.getIncludes(),
        order: [['index_number', 'DESC']],
        limit: currentLimit,
        offset: offset,
      });
      const rowsWithStats = await Promise.all(
        rows.map(async (item) => {
          const stats = await this.getInboundPaymentStats(item.guid);
          return {
            ...item.toJSON(),
            credit_payments: stats,
          };
        }),
      );
      return {
        status: 200,
        data: rowsWithStats,
        meta: {
          totalItems: count,
          totalPages: Math.ceil(count / currentLimit),
          currentPage,
          itemsPerPage: currentLimit,
        },
        message: 'Inbounds fetched successfully',
      };
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Inbound fetching error', error);
    }
  }


  async updateInbound(updateDto: UpdateInboundDto) {
    try {
      const inbound = await this.inboundRepository.findOne({
        where: { guid: updateDto.guid },
      });
      if (!inbound) {
        return errorResponse(HttpStatuses.NOT_FOUND, 'Inbound not found');
      }
      await inbound.update(updateDto as any);
      const updatedInbound = await this.inboundRepository.findOne({
        where: { guid: updateDto.guid },
        include: this.getIncludes(),
      });
      if (!updatedInbound) {
        return errorResponse(HttpStatuses.NOT_FOUND, 'Updated record not found');
      }
      const stats = await this.getInboundPaymentStats(updatedInbound.guid);
      const combinedData = {
        ...updatedInbound.toJSON(),
        credit_payments: stats,
      };
      return { status: 200, data: combinedData, message: 'Inbound updated successfully' };
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Update failed', error);
    }
  }


  async deleteInbound(guid: string) {
    try {
      const inbound = await this.inboundRepository.findByPk(guid);
      if (!inbound) {
        return errorResponse(HttpStatuses.NOT_FOUND, 'Inbound not found');
      }
      await inbound.destroy();
      return successResponse(HttpStatuses.OK, null, 'Inbound deleted successfully');
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Deletion failed', error);
    }
  }
}