import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Category } from './entities/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { I18nService } from 'nestjs-i18n';
import { errorResponse, successResponse } from '../../helpers/responseFunctions';
import { HttpStatuses } from '../../helpers/httpStatuses.enum';
import { Op, WhereOptions } from 'sequelize';
import { SYSTEM_CATEGORIES } from '../total_calculations/total_calculations.service';

@Injectable()
export class CategoryService {
  constructor(
    @InjectModel(Category)
    private readonly categoryRepository: typeof Category,
    private readonly i18n: I18nService,
  ) { }

  async addCategory(createDto: CreateCategoryDto, lang: string = 'tk') {
    try {
      const category = await this.categoryRepository.create({
        name: createDto.name,
      } as any);
      return successResponse(
        HttpStatuses.CREATED,
        category,
        this.i18n.t('category.created', { lang }),
      );
    } catch (error: any) {
      return errorResponse(
        HttpStatuses.INTERNAL_SERVER_ERROR,
        this.i18n.t('category.createFailed', { lang }),
        error,
      );
    }
  }


  async getAllCategories(
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

        const { rows, count } = await this.categoryRepository.findAndCountAll({
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
          message: this.i18n.t('category.listFetched', { lang }),
        };
      }
      const categories = await this.categoryRepository.findAll({
        where,
        order: [['index_number', 'ASC']],
      });
      return successResponse(
        HttpStatuses.OK,
        categories,
        this.i18n.t('category.listFetched', { lang }),
      );
    } catch (error: any) {
      return errorResponse(
        HttpStatuses.INTERNAL_SERVER_ERROR,
        this.i18n.t('category.fetchFailed', { lang }),
        error,
      );
    }
  }




  async updateCategory(updateDto: UpdateCategoryDto, lang: string = 'tk') {
    try {
      const category = await this.categoryRepository.findOne({
        where: { guid: updateDto.guid },
      });
      if (!category) {
        return errorResponse(
          HttpStatuses.NOT_FOUND,
          this.i18n.t('category.notFound', { lang }),
        );
      }
      await this.categoryRepository.update(
        {
          ...(updateDto.name !== undefined && { name: updateDto.name }),
        },
        { where: { guid: updateDto.guid } },
      );
      const updated = await this.categoryRepository.findOne({
        where: { guid: updateDto.guid },
      });
      return successResponse(
        HttpStatuses.OK,
        updated,
        this.i18n.t('category.updated', { lang }),
      );
    } catch (error: any) {
      return errorResponse(
        HttpStatuses.INTERNAL_SERVER_ERROR,
        this.i18n.t('category.updateFailed', { lang }),
        error,
      );
    }
  }



  async deleteCategory(guid: string, lang: string = 'tk') {
    try {
      if ((Object.values(SYSTEM_CATEGORIES) as string[]).includes(guid)) {
        return errorResponse(
          HttpStatuses.FORBIDDEN,
          this.i18n.t('category.cannotDeleteSystem', { lang }),
        );
      }
      const deletedCount = await this.categoryRepository.destroy({
        where: { guid },
      });
      if (deletedCount === 0) {
        return errorResponse(
          HttpStatuses.NOT_FOUND,
          this.i18n.t('category.notFound', { lang }),
        );
      }
      return successResponse(
        HttpStatuses.OK,
        null,
        this.i18n.t('category.deleted', { lang }),
      );
    } catch (error: any) {
      return errorResponse(
        HttpStatuses.INTERNAL_SERVER_ERROR,
        this.i18n.t('category.deleteFailed', { lang }),
        error,
      );
    }
  }
}
