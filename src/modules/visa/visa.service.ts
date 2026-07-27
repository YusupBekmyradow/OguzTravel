import { Injectable } from '@nestjs/common';
import { CreateVisaDto } from './dto/create-visa.dto';
import { UpdateVisaDto } from './dto/update-visa.dto';
import { InjectModel } from '@nestjs/sequelize';
import { Visa } from './entities/visa.entity';
import { Client } from '../client/entities/client.entity';
import { errorResponse, successResponse } from '../../helpers/responseFunctions';
import { HttpStatuses } from '../../helpers/httpStatuses.enum';
import { VisaPackage } from '../visa_package/entities/visa_package.entity';
import { Employee } from '../employee/entities/employee.entity';
import { Office } from '../office/entities/office.entity';

@Injectable()
export class VisaService {
  constructor(
    @InjectModel(Visa) private visaRepository: typeof Visa,
    @InjectModel(Client) private clientRepository: typeof Client
  ) { }

  private getVisaIncludes() {
    return [
      {
        model: Employee, as: 'receiveroperator', attributes: ['guid', 'fullName'],
        include: [{ model: Office, attributes: ['guid', 'fullName', 'shortName'] }]
      },
      { model: Client, attributes: ['guid', 'fullName', 'phone_number', 'passport_number', 'dateOfBirth', 'passport_count', 'passportHistory'] },
      { model: VisaPackage, as: 'package', attributes: ['guid', 'name', 'price', 'sale_price'] },
      { model: VisaPackage, as: 'service', attributes: ['guid', 'name', 'price', 'sale_price'] },
      { model: VisaPackage, as: 'hotel_booking', attributes: ['guid', 'name', 'price', 'sale_price'] },
      { model: VisaPackage, as: 'translation', attributes: ['guid', 'name', 'price', 'sale_price'] },
      { model: VisaPackage, as: 'courier', attributes: ['guid', 'name', 'price', 'sale_price'] },
    ];
  }

  private formatVisaPassport(visa: any) {
    if (!visa || !visa.client) return visa;
    const visaJson = visa.toJSON ? visa.toJSON() : visa;
    const client = visaJson.client;
    if (visaJson.passport_count && client.passport_count && visaJson.passport_count !== client.passport_count) {
      if (Array.isArray(client.passportHistory)) {
        const oldPassport = client.passportHistory.find(
          (p: any) => p.passport_count === visaJson.passport_count
        );
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


  async addVisa(createVisaDto: CreateVisaDto) {
    try {
      const client = await this.clientRepository.findByPk(createVisaDto.client_guid);
      if (!client) {
        return errorResponse(HttpStatuses.NOT_FOUND, 'Client not found for this visa');
      }

      const visa = await this.visaRepository.create({
        ...createVisaDto,
        passport_count: client.passport_count || 1,
      } as any);
      const newVisa = await this.visaRepository.findOne({
        where: { guid: visa.guid },
        attributes: {
          exclude: ['package_guid', 'service_guid', 'hotel_booking_guid', 'translation_guid', 'courier_guid']
        },
        include: this.getVisaIncludes()
      });
      if (!newVisa) {
        return errorResponse(HttpStatuses.NOT_FOUND, 'Visa not found')
      }
      const formattedVisa = this.formatVisaPassport(newVisa);
      return {
        status: 201,
        data: formattedVisa,
        message: 'Visa created successfully'
      }
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Visa creation failes', error)
    }
  }


  async getAllVisa(page: number = 1, limit: number = 10) {
    try {
      const currentPage = Math.max(1, Number(page));
      const currentLimit = Math.max(1, Number(limit));
      const offset = (currentPage - 1) * currentLimit;

      const { rows, count } = await this.visaRepository.findAndCountAll({
        attributes: {
          exclude: ['package_guid', 'service_guid', 'hotel_booking_guid', 'translation_guid', 'courier_guid']
        },
        include: this.getVisaIncludes(),
        order: [['createdAt', 'DESC']],
        limit: Number(limit),
        offset: Number(offset),
      });

      const formattedRows = rows.map(row => this.formatVisaPassport(row));
      return {
        status: 200,
        data: formattedRows,
        meta: {
          totalItems: count,
          totalPages: Math.ceil(count / limit),
          currentPage: currentPage
        },
        message: 'Visa fetched successfully'
      };
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Visa fetching error', error);
    }
  }


  async updateVisa(updateDto: UpdateVisaDto) {
    try {
      const existingVisa = await this.visaRepository.findByPk(updateDto.guid);
      if (!existingVisa) {
        return errorResponse(HttpStatuses.NOT_FOUND, 'Visa not found');
      }
      let updateData: any = { ...updateDto };
      if (updateDto.client_guid && updateDto.client_guid !== existingVisa.client_guid) {
        const client = await this.clientRepository.findByPk(updateDto.client_guid);
        if (client) {
          updateData.passport_count = client.passport_count || 1;
        }
      } else {
        updateData.passport_count = existingVisa.passport_count;
      }
      const [affectedCount] = await this.visaRepository.update(updateData, {
        where: { guid: updateDto.guid }
      });
      if (affectedCount === 0) return errorResponse(HttpStatuses.NOT_FOUND, 'Visa not found');

      const newVisa = await this.visaRepository.findOne({
        where: { guid: updateDto.guid },
        attributes: {
          exclude: ['package_guid', 'service_guid', 'hotel_booking_guid', 'translation_guid', 'courier_guid']
        },
        include: this.getVisaIncludes()
      });
      const formattedVisa = this.formatVisaPassport(newVisa);
      return {
        status: 200,
        data: formattedVisa,
        message: 'Visa updated successfully'
      };
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Update failed', error)
    }
  }


  async deleteVisa(guid: string) {
    try {
      const visa = await this.visaRepository.findByPk(guid);
      if (!visa) {
        return errorResponse(HttpStatuses.NOT_FOUND, 'Visa not found');
      }
      await visa.destroy();

      return successResponse(HttpStatuses.OK, null, 'Visa deleted successfully');
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Deletion failed', error)
    }
  }
}
