import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { RefferalCountry } from './entities/refferal_country.entity';
import { CreateRefferalCountryDto } from './dto/create-refferal_country.dto';
import { UpdateRefferalCountryDto } from './dto/update-refferal_country.dto';
import { I18nService } from 'nestjs-i18n';
import { errorResponse, successResponse } from '../../helpers/responseFunctions';
import { HttpStatuses } from '../../helpers/httpStatuses.enum';
import { Op } from 'sequelize';

@Injectable()
export class RefferalCountryService {
  constructor(
    @InjectModel(RefferalCountry)
    private readonly refferalCountryRepo: typeof RefferalCountry,
    private readonly i18n: I18nService,
  ) { }

  private normalizeName(name: any) {
    if (typeof name === 'string') {
      return {
        tk: name,
        ru: name,
        en: name,
      };
    }
    return name;
  }

  async addRefferalCountry(createDto: CreateRefferalCountryDto, lang: string = 'tk') {
    try {
      const normalizedName = this.normalizeName(createDto.name);
      const created = await this.refferalCountryRepo.create({
        name: normalizedName,
      } as any);

      return successResponse(
        HttpStatuses.CREATED,
        created,
        this.i18n.t('refferal_country.created', { lang }),
      );
    } catch (error: any) {
      return errorResponse(
        HttpStatuses.INTERNAL_SERVER_ERROR,
        this.i18n.t('refferal_country.createFailed', { lang }),
        error,
      );
    }
  }

  async getAllRefferalCountry(
    page?: number,
    limit?: number,
    search?: string,
    lang: string = 'tk',
  ) {
    try {
      const where: any = {};

      if (search && search.trim()) {
        const term = `%${search.trim()}%`;
        where[Op.or] = [
          { 'name.tk': { [Op.iLike]: term } },
          { 'name.ru': { [Op.iLike]: term } },
          { 'name.en': { [Op.iLike]: term } },
        ];
      }

      if (page !== undefined && limit !== undefined) {
        const currentPage = Math.max(1, Number(page));
        const currentLimit = Math.max(1, Number(limit));
        const offset = (currentPage - 1) * currentLimit;

        const { rows, count } = await this.refferalCountryRepo.findAndCountAll({
          where,
          order: [['index_number', 'DESC']],
          limit: currentLimit,
          offset,
        });

        return {
          status: HttpStatuses.OK,
          data: rows,
          meta: {
            totalItems: count,
            totalPages: Math.ceil(count / currentLimit),
            currentPage,
          },
          message: this.i18n.t('refferal_country.listFetched', { lang }),
        };
      }

      const countries = await this.refferalCountryRepo.findAll({
        where,
        order: [['index_number', 'ASC']],
      });

      return successResponse(
        HttpStatuses.OK,
        countries,
        this.i18n.t('refferal_country.listFetched', { lang }),
      );
    } catch (error: any) {
      return errorResponse(
        HttpStatuses.INTERNAL_SERVER_ERROR,
        this.i18n.t('refferal_country.fetchFailed', { lang }),
        error,
      );
    }
  }

  async updateRefferalCountry(updateDto: UpdateRefferalCountryDto, lang: string = 'tk') {
    try {
      const country = await this.refferalCountryRepo.findOne({
        where: { guid: updateDto.guid },
      });

      if (!country) {
        return errorResponse(
          HttpStatuses.NOT_FOUND,
          this.i18n.t('refferal_country.notFound', { lang }),
        );
      }

      const updateData: any = {};
      if (updateDto.name !== undefined) {
        updateData.name = this.normalizeName(updateDto.name);
      }

      await country.update(updateData);

      const updated = await this.refferalCountryRepo.findOne({
        where: { guid: updateDto.guid },
      });

      return successResponse(
        HttpStatuses.OK,
        updated,
        this.i18n.t('refferal_country.updated', { lang }),
      );
    } catch (error: any) {
      return errorResponse(
        HttpStatuses.INTERNAL_SERVER_ERROR,
        this.i18n.t('refferal_country.updateFailed', { lang }),
        error,
      );
    }
  }

  async deleteRefferalCountry(guid: string, lang: string = 'tk') {
    try {
      const deletedCount = await this.refferalCountryRepo.destroy({
        where: { guid },
      });

      if (deletedCount === 0) {
        return errorResponse(
          HttpStatuses.NOT_FOUND,
          this.i18n.t('refferal_country.notFound', { lang }),
        );
      }

      return successResponse(
        HttpStatuses.OK,
        null,
        this.i18n.t('refferal_country.deleted', { lang }),
      );
    } catch (error: any) {
      return errorResponse(
        HttpStatuses.INTERNAL_SERVER_ERROR,
        this.i18n.t('refferal_country.deleteFailed', { lang }),
        error,
      );
    }
  }
}
