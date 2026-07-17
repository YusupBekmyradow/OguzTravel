import { Injectable } from '@nestjs/common';
import { CreateVisaDto } from './dto/create-visa.dto';
import { UpdateVisaDto } from './dto/update-visa.dto';
import { InjectModel } from '@nestjs/sequelize';
import { Visa } from './entities/visa.entity';
import { Client } from '../client/entities/client.entity';
import { errorResponse, successResponse } from '../../helpers/responseFunctions';
import { HttpStatuses } from '../../helpers/httpStatuses.enum';
import { VisaPackage } from '../visa_package/entities/visa_package.entity';

@Injectable()
export class VisaService {
  constructor(
    @InjectModel(Visa) private visaRepository: typeof Visa
  ) { }

  private getVisaIncludes() {
    return [
      { model: Client, attributes: ['guid', 'fullName', 'phone_number', 'passport_number', 'dateOfBirth'] },
      { model: VisaPackage, as: 'package', attributes: ['guid', 'name', 'price', 'sale_price'] },
      { model: VisaPackage, as: 'service', attributes: ['guid', 'name', 'price', 'sale_price'] },
      { model: VisaPackage, as: 'hotel_booking', attributes: ['guid', 'name', 'price', 'sale_price'] },
      { model: VisaPackage, as: 'translation', attributes: ['guid', 'name', 'price', 'sale_price'] },
      { model: VisaPackage, as: 'courier', attributes: ['guid', 'name', 'price', 'sale_price'] },
    ];
  }

  async addVisa(createVisaDto: CreateVisaDto) {
    try {
      const visa = await this.visaRepository.create({
        ...createVisaDto
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
      return {
        status: 201,
        data: newVisa,
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

      return {
        status: 200,
        data: rows,
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
      const [affectedCount] = await this.visaRepository.update(updateDto, {
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
      return {
        status: 200,
        data: newVisa,
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
