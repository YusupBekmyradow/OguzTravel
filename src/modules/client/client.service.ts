import { Injectable } from '@nestjs/common';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { InjectModel } from '@nestjs/sequelize';
import { Client } from './entities/client.entity';
import { errorResponse, successResponse } from '../../helpers/responseFunctions';
import { HttpStatuses } from '../../helpers/httpStatuses.enum';
import { off } from 'process';
import { Op } from 'sequelize';
import { filter } from 'rxjs';

@Injectable()
export class ClientService {
  constructor(
    @InjectModel(Client) private clientRepository: typeof Client
  ) { }

  async addClient(createClientDto: CreateClientDto) {
    try {
      const client = await this.clientRepository.create({
        ...createClientDto
      } as any)
      return successResponse(HttpStatuses.CREATED, client, 'Employee create succussfully');
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Client creation failed', error)
    }
  }


  async getAllClient(page: number = 1, limit: number = 10,
    search?: string,
    filters?: { gender?: string, passportExpiryDate?: string }
  ) {
    try {
      const currentPage = Math.max(1, Number(page));
      const currentLimit = Math.max(1, Number(limit));
      const offset = (currentPage - 1) * currentLimit;

      const whereClause: any = {};

      if (search) {
        const sanitizedSearch = search.trim();
        whereClause[Op.or] = [
          { fullName: { [Op.iLike]: `%${sanitizedSearch}%` } },
          { passport_number: { [Op.iLike]: `%${sanitizedSearch}%` } }
        ];
      }

      if (filters?.gender) {
        whereClause.gender = filters.gender;
      }

      if (filters?.passportExpiryDate) {
        whereClause.passportExpiryDate = filters.passportExpiryDate;
      }

      const { count, rows } = await this.clientRepository.findAndCountAll({
        where: whereClause,
        limit: currentLimit,
        offset: offset,
        order: [['createdAt', 'DESC']]
      });

      return {
        status: 200,
        data: rows,
        meta: {
          totalItems: count,
          totalPages: Math.ceil(count / limit),
          currentPage: currentPage
        },
        message: 'Clients fetched successfully'
      };

    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Client fetching error', error);
    }
  }


  async updateClient(updateClientDto: UpdateClientDto) {
    try {
      const client = await this.clientRepository.findByPk(updateClientDto.guid);
      if (!client) {
        return errorResponse(HttpStatuses.NOT_FOUND, 'Client not founds')
      }
      await client.update({
        ...updateClientDto
      });
      await client.reload();
      return successResponse(HttpStatuses.OK, client, 'Client updated successfully')
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Update failed', error)
    }
  }

  async deleteClient(guid: string) {
    try {
      const client = await this.clientRepository.findByPk(guid);
      if (!client) {
        return errorResponse(HttpStatuses.NOT_FOUND, 'Client not found');
      }
      await client.destroy();
      return successResponse(HttpStatuses.OK, null, 'Client deleted successfully');
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Deletion failed', error);
    }
  }
}
