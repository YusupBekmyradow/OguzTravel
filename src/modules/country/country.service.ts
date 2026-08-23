import { Injectable, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Country } from './entities/country.entity';
import { CreateCountryDto } from './dto/create-country.dto';
import { UpdateCountryDto } from './dto/update-country.dto';
import { CustomField } from '../custom_field/entities/custom_field.entity';
import { I18nService } from 'nestjs-i18n';
import { QueryTypes, Op } from 'sequelize';
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
        index_number: country.index_number,
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
        index_number: updated.index_number,
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




  async findAll(
    page: number = 1,
    limit: number = 10,
    lang: string = 'tk',
    search?: string,
  ) {
    try {
      const currentPage = Math.max(1, Number(page));
      const currentLimit = Math.max(1, Math.min(100, Number(limit)));
      const offset = (currentPage - 1) * currentLimit;
      const sequelize = this.countryRepository.sequelize!;
      const searchTerm = search?.trim();
      const whereClause = searchTerm
        ? `WHERE co.code ILIKE :search
         OR co.name->>'tk' ILIKE :search
         OR co.name->>'ru' ILIKE :search
         OR co.name->>'en' ILIKE :search`
        : '';

      const replacements: any = { limit: currentLimit, offset };
      if (searchTerm) replacements.search = `%${searchTerm}%`;
      const [countResult, countryRows]: [any[], any[]] = await Promise.all([
        sequelize.query(
          `SELECT COUNT(*)::int AS total FROM tbl_country co ${whereClause}`,
          { replacements, type: QueryTypes.SELECT },
        ),
        sequelize.query(
          `
        SELECT co.guid, co.code, co.name, co."createdAt", co."updatedAt",
               co."index_number", co.custom_field_guids
        FROM tbl_country co
        ${whereClause}
        ORDER BY co."createdAt" DESC
        LIMIT :limit OFFSET :offset
        `,
          { replacements, type: QueryTypes.SELECT },
        ),
      ]);

      const total = Number(countResult[0]?.total || 0);
      const countryGuids = countryRows.map((c) => c.guid);

      let cfRows: any[] = [];
      if (countryGuids.length > 0) {
        cfRows = await sequelize.query(
          `
    SELECT
      co.guid AS country_guid,
      cf.guid AS cf_guid,
      cf.field_label,
      cf.field_type,
      cf.options,
      cf.sort_order,
      cf.field_key
    FROM tbl_country co
    LEFT JOIN tbl_custom_fields cf
      ON cf.guid::text = ANY(ARRAY(SELECT jsonb_array_elements_text(co.custom_field_guids)))
    WHERE co.guid IN (:guids)
    ORDER BY cf.sort_order ASC
    `,
          { replacements: { guids: countryGuids }, type: QueryTypes.SELECT },
        );
      }
      const countryMap = new Map<string, any>();
      for (const c of countryRows) {
        countryMap.set(c.guid, {
          guid: c.guid,
          code: c.code,
          name: c.name,
          custom_fields: [],
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
          index_number: c.index_number,
          _guidOrder: c.custom_field_guids || [],
        });
      }
      for (const row of cfRows) {
        if (row.cf_guid && countryMap.has(row.country_guid)) {
          countryMap.get(row.country_guid).custom_fields.push({
            guid: row.cf_guid,
            field_label: row.field_label,
            field_type: row.field_type,
            options: row.options,
            sort_order: row.sort_order,
            field_key: row.field_key,
          });
        }
      }

      const data = Array.from(countryMap.values()).map((c) => {
        const guidOrder: string[] = c._guidOrder;
        delete c._guidOrder;
        if (guidOrder.length > 0) {
          c.custom_fields = guidOrder
            .map((g: string) => c.custom_fields.find((f: any) => f.guid === g))
            .filter(Boolean);
        }
        return c;
      });

      return {
        status: 200,
        data,
        meta: {
          totalItems: total,
          totalPages: Math.ceil(total / currentLimit),
          currentPage: currentPage,
        },
        message: this.i18n.t('country.listFetched', { lang }),
      };
    } catch (error) {
      console.log(error)
      return errorResponse(
        HttpStatuses.INTERNAL_SERVER_ERROR,
        this.i18n.t('country.fetchFailed', { lang }),
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