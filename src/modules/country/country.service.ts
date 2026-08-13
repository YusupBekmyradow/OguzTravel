import { Injectable, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Country } from './entities/country.entity';
import { CreateCountryDto } from './dto/create-country.dto';
import { UpdateCountryDto } from './dto/update-country.dto';
import { CustomField } from '../custom_field/entities/custom_field.entity';
import { I18nService } from 'nestjs-i18n';
import { Op } from 'sequelize';
import { errorResponse, successResponse } from '../../helpers/responseFunctions';
import { HttpStatuses } from '../../helpers/httpStatuses.enum';

@Injectable()
export class CountryService {
  constructor(
    @InjectModel(Country)
    private readonly countryRepository: typeof Country,
    @InjectModel(CustomField)
    private readonly customFieldRepository: typeof CustomField,
    private readonly i18n: I18nService,
  ) { }



  async create(dto: CreateCountryDto, lang: string = 'tk') {
    try {
      const country = await this.countryRepository.create({
        code: dto.code,
        name: dto.name,
        custom_field_guids: dto.custom_field_guids || [],
      } as any);
      let hydratedFields: any[] = [];
      if (country.custom_field_guids && country.custom_field_guids.length > 0) {
        const fields = await this.customFieldRepository.findAll({
          where: {
            guid: { [Op.in]: country.custom_field_guids },
          },
        });
        hydratedFields = country.custom_field_guids
          .map((g) => fields.find((f) => f.guid === g))
          .filter(Boolean) as any[];
      }
      const responseData = {
        guid: country.guid,
        code: country.code,
        name: country.name,
        custom_fields: hydratedFields,
        createdAt: country.createdAt,
        updatedAt: country.updatedAt,
      };
      return successResponse(
        HttpStatuses.CREATED,
        responseData,
        this.i18n.t('country.created', { lang }),
      );
    } catch (error) {
      return errorResponse(
        HttpStatuses.INTERNAL_SERVER_ERROR,
        this.i18n.t('country.createFailed', { lang }),
        error,
      );
    }
  }


  async update(dto: UpdateCountryDto, lang: string = 'tk') {
    try {
      const country = await this.countryRepository.findOne({ where: { guid: dto.guid } });
      if (!country) {
        return errorResponse(
          HttpStatuses.NOT_FOUND,
          this.i18n.t('country.notFound', { lang }),
        );
      }
      await this.countryRepository.update(
        {
          ...(dto.code !== undefined && { code: dto.code }),
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.custom_field_guids !== undefined && { custom_field_guids: dto.custom_field_guids }),
        },
        { where: { guid: dto.guid } },
      );
      const updated = await this.countryRepository.findOne({ where: { guid: dto.guid } });
      if (!updated) {
        return errorResponse(
          HttpStatuses.NOT_FOUND,
          this.i18n.t('country.notFound', { lang }),
        );
      }
      let hydratedFields: any[] = [];
      if (updated.custom_field_guids && updated.custom_field_guids.length > 0) {
        const fields = await this.customFieldRepository.findAll({
          where: {
            guid: { [Op.in]: updated.custom_field_guids },
          },
        });
        hydratedFields = updated.custom_field_guids
          .map((g) => fields.find((f) => f.guid === g))
          .filter(Boolean) as any[];
      }
      const responseData = {
        guid: updated.guid,
        code: updated.code,
        name: updated.name,
        custom_fields: hydratedFields,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      };
      return successResponse(
        HttpStatuses.OK,
        responseData,
        this.i18n.t('country.updated', { lang }),
      );
    } catch (error) {
      return errorResponse(
        HttpStatuses.INTERNAL_SERVER_ERROR,
        this.i18n.t('country.updateFailed', { lang }),
        error,
      );
    }
  }


  async findAll(page: number = 1, limit: number = 10, lang: string = 'tk') {
    try {
      const offset = (page - 1) * limit;
      const { rows: countries, count } = await this.countryRepository.findAndCountAll({
        limit,
        offset,
        order: [['createdAt', 'DESC']],
      });
      const data = await Promise.all(
        countries.map(async (country) => {
          let hydratedFields: any[] = [];
          if (country.custom_field_guids && country.custom_field_guids.length > 0) {
            const fields = await this.customFieldRepository.findAll({
              where: {
                guid: { [Op.in]: country.custom_field_guids },
              },
            });
            hydratedFields = country.custom_field_guids
              .map((g) => fields.find((f) => f.guid === g))
              .filter(Boolean) as any[];
          }
          return {
            guid: country.guid,
            code: country.code,
            name: country.name,
            custom_fields: hydratedFields,
            createdAt: country.createdAt,
            updatedAt: country.updatedAt,
          };
        }),
      );

      return {
        status: 200,
        data: data,
        meta: {
          totalItems: count,
          totalPages: Math.ceil(count / limit),
          currentPage: page,
        },
        message: this.i18n.t('general_translation.listFetched', { lang }),
      };
    } catch (error) {
      return errorResponse(
        HttpStatuses.INTERNAL_SERVER_ERROR,
        this.i18n.t('custom_field.fetchFailed', { lang }),
        error,
      );
    }
  }



  async remove(guid: string, lang: string = 'tk') {
    try {
      const country = await this.countryRepository.findByPk(guid);
      if (!country) {
        return errorResponse(
          HttpStatuses.NOT_FOUND,
          this.i18n.t('country.notFound', { lang }),
        );
      }
      await country.destroy();
      return successResponse(
        HttpStatuses.OK,
        { guid },
        this.i18n.t('country.deleted', { lang }),
      );
    } catch (error) {
      return errorResponse(
        HttpStatuses.INTERNAL_SERVER_ERROR,
        this.i18n.t('country.deleteFailed', { lang }),
        error,
      );
    }
  }
}