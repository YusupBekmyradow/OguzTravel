import { Injectable } from '@nestjs/common';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { InjectModel } from '@nestjs/sequelize';
import { Client } from './entities/client.entity';
import { errorResponse, successResponse } from '../../helpers/responseFunctions';
import { HttpStatuses } from '../../helpers/httpStatuses.enum';
import { Op } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { UpdatePassportDto } from './dto/updata-passport.dto';
import { ImagesService } from '../../common/image-upload/image-upload.module';

@Injectable()
export class ClientService {
  constructor(
    @InjectModel(Client) private clientRepository: typeof Client,
    private readonly sequelize: Sequelize,
    private readonly imagesService: ImagesService,
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
    filters?: { gender?: string, passportExpiryDate?: string, passportIssueDate?: string }
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
          { phone_number: { [Op.iLike]: `%${sanitizedSearch}%` } },
          { passport_number: { [Op.iLike]: `%${sanitizedSearch}%` } }
        ];
      }

      if (filters?.gender) {
        whereClause.gender = filters.gender;
      }

      if (filters?.passportExpiryDate) {
        whereClause.passportExpiryDate = filters.passportExpiryDate;
      }

      if (filters?.passportIssueDate) {
        whereClause.passportIssueDate = filters.passportIssueDate;
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
    const transaction = await this.sequelize.transaction();
    try {
      const { guid, images, ...updateData } = updateClientDto as any;

      const client = await this.clientRepository.findByPk(updateClientDto.guid, { transaction });
      if (!client) {
        await transaction.rollback();
        return errorResponse(HttpStatuses.NOT_FOUND, 'Client not founds')
      }
      if (images && images.length > 0 && client.images && Array.isArray(client.images)) {
        this.imagesService.deleteFiles(client.images);
        updateData.images = images.map((file: any) => file.path || file);
      }

      await client.update(updateData, { transaction });
      await transaction.commit();
      await client.reload();
      return successResponse(HttpStatuses.OK, client, 'Client updated successfully');
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Update failed', error)
    }
  }



  async deleteClient(guid: string) {
    const transaction = await this.clientRepository.sequelize?.transaction();
    try {
      const client = await this.clientRepository.findByPk(guid);
      if (!client) {
        await transaction?.rollback();
        return errorResponse(HttpStatuses.NOT_FOUND, 'Client not found');
      }
      if (client.images && Array.isArray(client.images) && client.images.length > 0) {
        this.imagesService.deleteFiles(client.images);
      }
      if (client.passportHistory && Array.isArray(client.passportHistory)) {
        for (const historyItem of client.passportHistory) {
          if (historyItem.images && Array.isArray(historyItem.images) && historyItem.images.length > 0) {
            this.imagesService.deleteFiles(historyItem.images);
          }
        }
      }
      await client.destroy({ transaction });
      await transaction?.commit();

      return successResponse(HttpStatuses.OK, null, 'Client deleted successfully');
    } catch (error) {
      await transaction?.rollback();
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Deletion failed', error);
    }
  }




  async updatePassportToHistory(updatePassportDto: UpdatePassportDto) {
    const transaction = await this.clientRepository.sequelize?.transaction();
    try {
      const {
        guid,
        passport_number,
        passportExpiryDate,
        passportCountryOfIssue,
        passportIssueDate,
        images
      } = updatePassportDto;
      const client = await this.clientRepository.findByPk(guid, { transaction });
      if (!client) {
        await transaction?.rollback();
        return errorResponse(HttpStatuses.NOT_FOUND, 'Client not found');
      }

      const formattedNewImages = images ? images.map((file: any) => file.path || file) : [];

      if (client.images && JSON.stringify(client.images) !== JSON.stringify(formattedNewImages)) {
        const oldPassportData = {
          passport_number: client.passport_number,
          passportExpiryDate: client.passportExpiryDate,
          passportCountryOfIssue: client.passportCountryOfIssue,
          passportIssueDate: client.passportIssueDate,
          passport_count: client.passport_count || 1,
          images: client.images,
          archivedAt: new Date()
        };

        const history = Array.isArray(client.passportHistory)
          ? [...client.passportHistory]
          : [];

        history.push(oldPassportData);
        client.passportHistory = history;

        client.passport_count = (client.passport_count || 1) + 1;
      }
      client.passport_number = passport_number;
      client.passportExpiryDate = passportExpiryDate;
      client.passportCountryOfIssue = passportCountryOfIssue;
      client.passportIssueDate = passportIssueDate;
      client.images = formattedNewImages;
      await client.save({ transaction });
      await transaction?.commit();

      return successResponse(HttpStatuses.OK, client, 'Passport archived and updated successfully');
    } catch (error) {
      await transaction?.rollback();
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Passport update failed', error);
    }
  }



}
