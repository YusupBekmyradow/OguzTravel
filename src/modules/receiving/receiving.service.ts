import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Receiving } from './entities/receiving.entity';
import { CreateReceivingDto } from './dto/create-receiving.dto';
import { UpdateReceivingDto } from './dto/update-receiving.dto';
import { Op } from 'sequelize';
import { Country } from '../country/entities/country.entity';
import { CustomField } from '../custom_field/entities/custom_field.entity';
import { HttpStatuses } from '../../helpers/httpStatuses.enum';
import { errorResponse, successResponse } from '../../helpers/responseFunctions';
import { I18nService } from 'nestjs-i18n';
import { Client } from '../client/entities/client.entity';
import { Employee } from '../employee/entities/employee.entity';
import { Office } from '../office/entities/office.entity';


@Injectable()
export class ReceivingService {
  constructor(
    @InjectModel(Receiving) private readonly receivingRepository: typeof Receiving,
    @InjectModel(Country) private readonly countryRepository: typeof Country,
    @InjectModel(CustomField) private readonly customFieldRepository: typeof CustomField,
    @InjectModel(Client) private readonly clientRepository: typeof Client,
    private readonly i18n: I18nService,
  ) { }

  private getReceivingIncludes() {
    return [
      {
        model: Client,
        attributes: [
          'guid',
          'fullName',
          'passport_number',
          'passportExpiryDate',
          'passportCountryOfIssue',
          'passport_count',
          'passportHistory',
          'phone_number',
          'dateOfBirth',
        ],
      },
      Employee,
      Office,
      Country,
    ];
  }


  private formatReceivingPassport(item: any, lang: string = 'tk') {
    if (!item) return item;
    const jsonItem = item.toJSON ? item.toJSON() : item;
    const client = jsonItem.client;

    if (client) {
      if (jsonItem.passport_count && client.passport_count && jsonItem.passport_count !== client.passport_count) {
        if (Array.isArray(client.passportHistory)) {
          const oldPassport = client.passportHistory.find(
            (p: any) => p.passport_count === jsonItem.passport_count
          );
          if (oldPassport) {
            client.passport_number = oldPassport.passport_number;
            client.passportExpiryDate = oldPassport.passportExpiryDate;
            client.passportCountryOfIssue = oldPassport.passportCountryOfIssue;
          }
        }
      }
      delete client.passportHistory;
    }

    return {
      guid: jsonItem.guid,
      application_date: jsonItem.application_date,
      visa_type: jsonItem.visa_type,
      note: jsonItem.note,
      custom_field_values: jsonItem.custom_field_values,
      passport_count: jsonItem.passport_count,
      createdAt: jsonItem.createdAt,
      updatedAt: jsonItem.updatedAt,
      
      client_name: client?.fullName || null,
      passport_number: client?.passport_number || null,
      phone_number: client?.phone_number || null,
      dateOfBirth: client?.dateOfBirth || null,
      passportExpiryDate: client?.passportExpiryDate || null,
      passportCountryOfIssue: client?.passportCountryOfIssue || null,
      
      operator_fullName: jsonItem.operator?.fullName || null,
      
      office_fullName: jsonItem.office?.fullName ? (jsonItem.office.fullName[lang] || jsonItem.office.fullName['tk'] || jsonItem.office.fullName) : null,
      office_shortName: jsonItem.office?.shortName ? (jsonItem.office.shortName[lang] || jsonItem.office.shortName['tk'] || jsonItem.office.shortName) : null,
      
      country_name: jsonItem.country?.name ? (jsonItem.country.name[lang] || jsonItem.country.name['tk'] || jsonItem.country.name) : null,
      office_guid: jsonItem.office_guid,
      operator_guid: jsonItem.operator_guid,
      client_guid: jsonItem.client_guid,
      country_guid: jsonItem.country_guid,
    };
  }



  async addReceiving(dto: CreateReceivingDto, lang: string = 'tk') {
    try {
      const country = await this.countryRepository.findByPk(dto.country_guid);
      if (!country) {
        throw new NotFoundException(this.i18n.t('country.notFound', { lang }));
      }
      const client = await this.clientRepository.findByPk(dto.client_guid);
      let processedCustomValues: Record<string, any> = {};
      if (dto.custom_field_values && country.custom_field_guids && country.custom_field_guids.length > 0) {
        const customFields = await this.customFieldRepository.findAll({
          where: { guid: { [Op.in]: country.custom_field_guids } },
        });
        for (const [key, value] of Object.entries(dto.custom_field_values)) {
          const matchedField = customFields.find((f) => f.field_key === key);
          if (matchedField) {
            processedCustomValues[key] = value;
          }
        }
      }
      const receiving = await this.receivingRepository.create({
        ...dto,
        custom_field_values: processedCustomValues,
        passport_count: client ? (client.passport_count || 1) : 1,
      } as any);
      const createdWithRelations = await this.receivingRepository.findByPk(receiving.guid, {
        include: this.getReceivingIncludes(),
      });
      return successResponse(
        HttpStatuses.CREATED,
        this.formatReceivingPassport(createdWithRelations, lang),
        this.i18n.t('receiving.created', { lang }),
      );
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('receiving.createFailed', { lang }), error);
    }
  }



  async findAllReceiving(query: { page?: number; limit?: number; search?: string; country_guid?: string; office_guid?: string }, lang: string = 'tk') {
    try {
      const page = Number(query.page) || 1;
      const limit = Number(query.limit) || 10;
      const offset = (page - 1) * limit;
      const whereClause: any = {};
      if (query.country_guid) whereClause.country_guid = query.country_guid;
      if (query.office_guid) whereClause.office_guid = query.office_guid;
      if (query.search) {
        whereClause[Op.or] = [
          { visa_type: { [Op.iLike]: `%${query.search}%` } },
          { note: { [Op.iLike]: `%${query.search}%` } },
        ];
      }
      const { rows, count } = await this.receivingRepository.findAndCountAll({
        where: whereClause,
        limit,
        offset,
        include: this.getReceivingIncludes(),
        order: [['createdAt', 'DESC']],
      });
      const formattedData = rows.map((row) => this.formatReceivingPassport(row, lang));
      return successResponse(HttpStatuses.OK, {
        totalItems: count,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        data: formattedData,
      }, this.i18n.t('receiving.fetched', { lang }));
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('receiving.fetchFailed', { lang }), error);
    }
  }



  async updateReceiving(dto: UpdateReceivingDto, lang: string = 'tk') {
    try {
      const targetGuid = dto.guid
      const receiving = await this.receivingRepository.findByPk(targetGuid);
      if (!receiving) {
        throw new NotFoundException(this.i18n.t('receiving.notFound', { lang }));
      }
      let updateData: any = { ...dto };
      const targetClientGuid = dto.client_guid || receiving.client_guid;
      const client = await this.clientRepository.findByPk(targetClientGuid);
      if (client) {
        updateData.passport_count = client.passport_count || 1;
      } else {
        updateData.passport_count = receiving.passport_count;
      }
      let processedCustomValues = receiving.custom_field_values;
      if (dto.custom_field_values) {
        const targetCountryGuid = dto.country_guid || receiving.country_guid;
        const country = await this.countryRepository.findByPk(targetCountryGuid);
        if (country && country.custom_field_guids) {
          const customFields = await this.customFieldRepository.findAll({
            where: { guid: { [Op.in]: country.custom_field_guids } },
          });

          processedCustomValues = {};
          for (const [key, value] of Object.entries(dto.custom_field_values)) {
            const matchedField = customFields.find((f) => f.field_key === key);
            if (matchedField) {
              processedCustomValues[key] = value;
            }
          }
        }
      }
      updateData.custom_field_values = processedCustomValues;
      await receiving.update(updateData);
      const updatedWithRelations = await this.receivingRepository.findByPk(targetGuid, {
        include: this.getReceivingIncludes(),
      });
      return successResponse(HttpStatuses.OK, this.formatReceivingPassport(updatedWithRelations, lang), this.i18n.t('receiving.updated', { lang }));
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('receiving.updateFailed', { lang }), error);
    }
  }


  async deleteReceiving(bodyGuid: string, lang: string = 'tk') {
    try {
      const receiving = await this.receivingRepository.findByPk(bodyGuid);
      if (!receiving) {
        throw new NotFoundException(this.i18n.t('receiving.notFound', { lang }));
      }
      await receiving.destroy();
      return successResponse(HttpStatuses.OK, { guid: bodyGuid }, this.i18n.t('receiving.deleted', { lang }));
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('receiving.deleteFailed', { lang }), error);
    }
  }
}