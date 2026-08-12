import { Injectable, BadRequestException } from '@nestjs/common';
import { CreateCountryDto } from './dto/create-country.dto';
import { UpdateCountryDto } from './dto/update-country.dto';
import { InjectConnection, InjectModel } from '@nestjs/sequelize';
import { Country } from './entities/country.entity';
import { CustomField } from '../custom_field/entities/custom_field.entity';
import { errorResponse, successResponse } from '../../helpers/responseFunctions';
import { HttpStatuses } from '../../helpers/httpStatuses.enum';
import { I18nService } from 'nestjs-i18n';
import { Op } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';

@Injectable()
export class CountryService {
  constructor(
    @InjectModel(Country) private countryRepository: typeof Country,
    @InjectModel(CustomField) private customFieldRepository: typeof CustomField,
    @InjectConnection() private readonly sequelize: Sequelize,
    private readonly i18n: I18nService,
  ) { }

async addCountry(createCountryDto: CreateCountryDto, lang: string) {
  const transaction = await this.sequelize.transaction();
  try {
    const { custom_fields, ...countryData } = createCountryDto;

    // 1. Öň şol code bilen ýurt barmy ýa-da ýok barlarys
    let country = await this.countryRepository.findOne({
      where: { code: countryData.code },
      transaction,
    });

    if (country) {
      // Eger bar bolsa, maglumatlaryny (name we ş.m.) täzeleyäris
      await country.update(countryData, { transaction });
    } else {
      // Ýok bolsa täze döredýäris
      country = await this.countryRepository.create(countryData as any, { transaction });
    }

    // 2. Custom field-leri barlaýarys we goşýarys/täzeleyäris
    if (custom_fields && custom_fields.length > 0) {
      for (const cf of custom_fields) {
        if (cf.field_type === 'select' && (!cf.options || cf.options.length === 0)) {
          throw new BadRequestException(
            `Options are required and must not be empty for select field '${cf.field_key}'`,
          );
        }

        // Şol ýurtda bu field_key eýýäm bar or ýok barlarys
        const existingField = await this.customFieldRepository.findOne({
          where: {
            country_guid: country.guid,
            field_key: cf.field_key,
          },
          transaction,
        });

        const fieldPayload = {
          ...cf,
          country_guid: country.guid,
          is_required: true,
          options: cf.field_type === 'select' ? cf.options : null,
          is_active: true,
        };

        if (existingField) {
          // Eger öňden bar bolsa, üýtgekmeleri update edýäris
          await existingField.update(fieldPayload as any, { transaction });
        } else {
          // Ýok bolsa täzeden döredýäris
          await this.customFieldRepository.create(fieldPayload as any, { transaction });
        }
      }
    }

    await transaction.commit();

    // 3. Jemleýji maglumaty custom_fields bilen birlikde yzyna gaýtarýarys
    const createdCountryWithFields = await this.countryRepository.findOne({
      where: { guid: country.guid },
      include: [{ model: CustomField, as: 'custom_fields' }],
    });

    return successResponse(
      HttpStatuses.CREATED,
      createdCountryWithFields,
      this.i18n.t('country.created', { lang }),
    );
  } catch (error: any) {
    await transaction.rollback();
    if (error instanceof BadRequestException) {
      throw error;
    }
    return errorResponse(
      HttpStatuses.INTERNAL_SERVER_ERROR,
      this.i18n.t('country.createFailed', { lang }),
      error,
    );
  }
}


  async getAllCountry(page: number = 1, limit: number = 10, search?: string, lang: string = 'tk') {
    try {
      const currentPage = Math.max(1, Number(page));
      const currentLimit = Math.max(1, Number(limit));
      const offset = (currentPage - 1) * currentLimit;

      const whereClause: any = {};
      if (search && search.trim()) {
        const sanitizedSearch = search.trim();
        whereClause[Op.or] = [
          { code: { [Op.iLike]: `%${sanitizedSearch}%` } },
          { 'name.tk': { [Op.iLike]: `%${sanitizedSearch}%` } },
          { 'name.ru': { [Op.iLike]: `%${sanitizedSearch}%` } },
          { 'name.en': { [Op.iLike]: `%${sanitizedSearch}%` } },
        ];
      }

      const { rows, count } = await this.countryRepository.findAndCountAll({
        where: whereClause,
        include: [{ model: CustomField, as: 'custom_fields' }],
        order: [['createdAt', 'DESC']],
        limit: currentLimit,
        offset: offset,
        distinct: true,
      });

      return {
        status: HttpStatuses.OK,
        data: rows,
        meta: {
          totalItems: count,
          totalPages: Math.ceil(count / currentLimit),
          currentPage,
        },
        message: this.i18n.t('country.listFetched', { lang }),
      };
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('country.fetchFailed', { lang }), error);
    }
  }


  async updateCountry(updateCountryDto: UpdateCountryDto, lang: string) {
    try {
      const country = await this.countryRepository.findOne({ where: { guid: updateCountryDto.guid } });
      if (!country) return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('country.notFound', { lang }));

      await this.countryRepository.update(updateCountryDto as any, { where: { guid: updateCountryDto.guid } });
      const updatedCountry = await this.countryRepository.findOne({
        where: { guid: updateCountryDto.guid },
        include: [{ model: CustomField, as: 'custom_fields' }],
      });

      return successResponse(HttpStatuses.OK, updatedCountry, this.i18n.t('country.updated', { lang }));
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('country.updateFailed', { lang }), error);
    }
  }

  
  async deleteCountry(guid: string, lang: string) {
    try {
      const deletedCount = await this.countryRepository.destroy({ where: { guid } });
      if (deletedCount === 0) return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('country.notFound', { lang }));

      return successResponse(HttpStatuses.OK, null, this.i18n.t('country.deleted', { lang }));
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('country.deleteFailed', { lang }), error);
    }
  }
}
