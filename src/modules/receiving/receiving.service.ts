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
    @InjectModel(Receiving)
    private readonly receivingRepository: typeof Receiving,
    @InjectModel(Country)
    private readonly countryRepository: typeof Country,
    @InjectModel(Client)
    private readonly clientRepository: typeof Client,
    @InjectModel(Employee)
    private readonly employeeRepository: typeof Employee,
    @InjectModel(Office)
    private readonly officeRepository: typeof Office,
    @InjectModel(CustomField)
    private readonly customFieldRepository: typeof CustomField,
    private readonly i18n: I18nService,
  ) { }


  private formatReceivingResponse(item: any, lang: string = 'tk') {
    const plain = item.get ? item.get({ plain: true }) : item;

    return {
      guid: plain.guid,
      application_date: plain.application_date,
      visa_type: plain.visa_type,
      note: plain.note,
      custom_field_values: plain.custom_field_values,
      createdAt: plain.createdAt,
      updatedAt: plain.updatedAt,
      client_name: plain.client?.fullName || null,
      passport_number: plain.client?.passport_number || null,
      phone_number: plain.client?.phone_number || null,
      dateOfBirth: plain.client?.dateOfBirth || null,
      operator_fullName: plain.operator?.fullName || null,
      office_fullName: plain.office?.fullName ? (plain.office.fullName[lang] || plain.office.fullName['tk'] || plain.office.fullName) : null,
      office_shortName: plain.office?.shortName ? (plain.office.shortName[lang] || plain.office.shortName['tk'] || plain.office.shortName) : null,
      country_name: plain.country?.name ? (plain.country.name[lang] || plain.country.name['tk'] || plain.country.name) : null,
      office_guid: plain.office_guid,
      operator_guid: plain.operator_guid,
      client_guid: plain.client_guid,
      country_guid: plain.country_guid,
    };
  }

  async create(dto: CreateReceivingDto, lang: string = 'tk') {
    try {
      const country = await this.countryRepository.findByPk(dto.country_guid);
      if (!country) {
        throw new NotFoundException(this.i18n.t('country.notFound', { lang }));
      }
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
      } as any);

      const createdWithRelations = await this.receivingRepository.findByPk(receiving.guid, {
        include: [Client, Employee, Office, Country],
      });
      return successResponse(
        HttpStatuses.CREATED,
        this.formatReceivingResponse(createdWithRelations, lang),
        this.i18n.t('receiving.created', { lang }),
      );
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('receiving.createFailed', { lang }), error);
    }
  }



  async findAll(query: { page?: number; limit?: number; search?: string; country_guid?: string; office_guid?: string }, lang: string = 'tk') {
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
        include: [Client, Employee, Office, Country],
        order: [['createdAt', 'DESC']],
      });
      const formattedData = rows.map((row) => this.formatReceivingResponse(row, lang));
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


  async update(dto: UpdateReceivingDto, lang: string = 'tk') {
    try {
      const targetGuid = dto.guid
      const receiving = await this.receivingRepository.findByPk(targetGuid);
      if (!receiving) {
        throw new NotFoundException(this.i18n.t('receiving.notFound', { lang }));
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
      await receiving.update({
        ...dto,
        custom_field_values: processedCustomValues,
      });

      const updatedWithRelations = await this.receivingRepository.findByPk(targetGuid, {
        include: [Client, Employee, Office, Country],
      });
      return successResponse(HttpStatuses.OK, this.formatReceivingResponse(updatedWithRelations, lang), this.i18n.t('receiving.updated', { lang }));
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