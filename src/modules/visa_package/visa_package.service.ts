import { Injectable } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { CreateVisaPackageDto } from './dto/create-visa_package.dto';
import { UpdateVisaPackageDto } from './dto/update-visa_package.dto';
import { InjectModel } from '@nestjs/sequelize';
import { VisaPackage } from './entities/visa_package.entity';
import { errorResponse, successResponse } from '../../helpers/responseFunctions';
import { HttpStatuses } from '../../helpers/httpStatuses.enum';
import { VisaCategory } from '../visa_category/entities/visa_category.entity';

@Injectable()
export class VisaPackageService {
  constructor(
    @InjectModel(VisaPackage)
    private visaPackageRepository: typeof VisaPackage,
    @InjectModel(VisaCategory)
    private visaCategoryRepository: typeof VisaCategory,
    private readonly i18n: I18nService,
  ) { }
  async addVisaPackage(createDto: CreateVisaPackageDto, lang: string) {
    try {
      const pkg = await this.visaPackageRepository.create({ ...createDto } as any);
      return successResponse(HttpStatuses.CREATED, pkg, this.i18n.t('visa_package.created', { lang }));
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('visa_package.createFailed', { lang }), error);
    }
  }


  async getAllVisaPackages(index: number, lang: string = 'tk') {
    try {
      const category = await this.visaCategoryRepository.findOne({
        where: { index_number: index }
      });

      if (!category) {
        return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('visa_package.categoryNotFound', { lang }));
      }

      const packages = await this.visaPackageRepository.findAll({
        where: { category_guid: category.guid },
        order: [['index_number', 'ASC']]
      });

      return successResponse(HttpStatuses.OK, packages, this.i18n.t('visa_package.listFetched', { lang }));
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('visa_package.fetchFailed', { lang }), error);
    }
  }

  async getAllVisaPack(lang: string = 'tk') {
    try {
      const packages = await this.visaPackageRepository.findAll();
      return successResponse(HttpStatuses.OK, packages, this.i18n.t('visa_package.listFetched', { lang }));
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('visa_package.fetchFailed', { lang }), error);
    }
  }

  async updateVisaPackage(updateDto: UpdateVisaPackageDto, lang: string) {
    try {
      const pkg = await this.visaPackageRepository.findOne({ where: { guid: updateDto.guid } });
      if (!pkg) return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('visa_package.notFound', { lang }));

      await this.visaPackageRepository.update(updateDto as any, { where: { guid: updateDto.guid } });
      const updatedPkg = await this.visaPackageRepository.findOne({ where: { guid: updateDto.guid } });

      return successResponse(HttpStatuses.OK, updatedPkg, this.i18n.t('visa_package.updated', { lang }));
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('visa_package.updateFailed', { lang }), error);
    }
  }

  async deleteVisaPackage(guid: string, lang: string) {
    try {
      const deletedCount = await this.visaPackageRepository.destroy({ where: { guid } });
      if (deletedCount === 0) return errorResponse(HttpStatuses.NOT_FOUND, this.i18n.t('visa_package.notFound', { lang }));

      return successResponse(HttpStatuses.OK, null, this.i18n.t('visa_package.deleted', { lang }));
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, this.i18n.t('visa_package.deleteFailed', { lang }), error);
    }
  }
}




