import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import { I18nService } from 'nestjs-i18n';
import { CustomField } from './entities/custom_field.entity';
import { CreateCustomFieldDto } from './dto/create-custom-field.dto';
import { UpdateCustomFieldDto } from './dto/update-custom-field.dto';
import { FieldType } from '../../enums/custom-field-type.enum';
import { errorResponse, successResponse } from '../../helpers/responseFunctions';
import { HttpStatuses } from '../../helpers/httpStatuses.enum';

interface FindCustomFieldsParams {
  page?: number;
  limit?: number;
  field_type?: FieldType;
  option_search?: string;
}

@Injectable()
export class CustomFieldService {
  constructor(
    @InjectModel(CustomField)
    private readonly customFieldRepository: typeof CustomField,
    private readonly i18n: I18nService,
  ) { }

  async addCustomField(dto: CreateCustomFieldDto, lang: string = 'tk') {
    try {
      const created = await this.customFieldRepository.create({ ...dto } as any);

      return successResponse(
        HttpStatuses.CREATED,
        created,
        this.i18n.t('custom_field.created', { lang }),
      );
    } catch (error) {
      return errorResponse(
        HttpStatuses.INTERNAL_SERVER_ERROR,
        this.i18n.t('custom_field.createFailed', { lang }),
        error,
      );
    }
  }



  async getCustomFieldsByCountry(
    lang: string = 'tk',
    params: FindCustomFieldsParams,
  ) {
    try {
      const page = params.page && params.page > 0 ? params.page : 1;
      const limit = params.limit && params.limit > 0 ? params.limit : 20;
      const offset = (page - 1) * limit;
      const where: any = {};
      if (params.field_type) {
        where.field_type = params.field_type;
      }

      if (params.option_search) {
        const searchKeyword = `%${params.option_search.toLowerCase().trim()}%`;

        where[Op.and] = [
          where[Op.and] || {},
          {
            [Op.or]: [
              Sequelize.where(
                Sequelize.fn('LOWER', Sequelize.json('field_label.tk')),
                { [Op.like]: searchKeyword }
              ),
              Sequelize.where(
                Sequelize.fn('LOWER', Sequelize.json('field_label.ru')),
                { [Op.like]: searchKeyword }
              ),
              Sequelize.where(
                Sequelize.fn('LOWER', Sequelize.json('field_label.en')),
                { [Op.like]: searchKeyword }
              ),
              Sequelize.where(
                Sequelize.fn('LOWER', Sequelize.cast(Sequelize.col('options'), 'text')),
                { [Op.like]: searchKeyword }
              ),
            ],
          },
        ];
      }
      const { rows, count } = await this.customFieldRepository.findAndCountAll({
        where,
        limit,
        offset,
        order: [['sort_order', 'ASC']],
      });

      return {
        status: 200,
        data: rows,
        meta: {
          totalItems: count,
          totalPages: Math.ceil(count / limit),
          currentPage: page,
        },
        message: this.i18n.t('custom_field.listFetched', { lang }),
      };
    } catch (error) {
      return errorResponse(
        HttpStatuses.INTERNAL_SERVER_ERROR,
        this.i18n.t('custom_field.fetchFailed', { lang }),
        error,
      );
    }
  }


  async updateCustomField(dto: UpdateCustomFieldDto, lang: string = 'tk') {
    try {
      const { guid, ...rest } = dto;

      const field = await this.customFieldRepository.findOne({ where: { guid } });
      if (!field) {
        throw new NotFoundException(
          this.i18n.t('custom_field.notFound', { lang }) || 'Custom field not found',
        );
      }

      if (rest.field_type && rest.field_type !== FieldType.SELECT) {
        rest.options = null as any;
      }

      await field.update(rest);

      return successResponse(
        HttpStatuses.OK,
        field,
        this.i18n.t('custom_field.updated', { lang }),
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      return errorResponse(
        HttpStatuses.INTERNAL_SERVER_ERROR,
        this.i18n.t('custom_field.updateFailed', { lang }),
        error,
      );
    }
  }


  async deleteCustomField(guid: string, lang: string = 'tk') {
    try {
      if (!guid) {
        throw new BadRequestException('guid is required');
      }

      const field = await this.customFieldRepository.findOne({ where: { guid } });
      if (!field) {
        throw new NotFoundException(
          this.i18n.t('custom_field.notFound', { lang }) || 'Custom field not found',
        );
      }
      await field.destroy();
      return successResponse(
        HttpStatuses.OK,
        null,
        this.i18n.t('custom_field.deleted', { lang }),
      );
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      return errorResponse(
        HttpStatuses.INTERNAL_SERVER_ERROR,
        this.i18n.t('custom_field.deleteFailed', { lang }),
        error,
      );
    }
  }
}