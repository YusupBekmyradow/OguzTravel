import { Injectable } from '@nestjs/common';
import { CreateVisaPackageDto } from './dto/create-visa_package.dto';
import { UpdateVisaPackageDto } from './dto/update-visa_package.dto';
import { InjectModel } from '@nestjs/sequelize';
import { VisaPackage } from './entities/visa_package.entity';
import { errorResponse, successResponse } from '../../helpers/responseFunctions';
import { HttpStatuses } from '../../helpers/httpStatuses.enum';

@Injectable()
export class VisaPackageService {
  constructor(
    @InjectModel(VisaPackage)
    private visaPackageRepository: typeof VisaPackage,
  ) { }
  async addVisaPackage(createDto: CreateVisaPackageDto) {
    try {
      const pkg = await this.visaPackageRepository.create({ ...createDto } as any);
      return successResponse(HttpStatuses.CREATED, pkg, 'Package created successfully');
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Package creation failed', error);
    }
  }

  async getAllVisaPackages() {
    try {
      const packages = await this.visaPackageRepository.findAll({ order: [['index_number', 'ASC']] });
      return successResponse(HttpStatuses.OK, packages, 'Packages fetched successfully');
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Packages fetching error', error);
    }
  }

  async updateVisaPackage(updateDto: UpdateVisaPackageDto) {
    try {
      const pkg = await this.visaPackageRepository.findOne({ where: { guid: updateDto.guid } });
      if (!pkg) return errorResponse(HttpStatuses.NOT_FOUND, 'Package not found');

      await this.visaPackageRepository.update(updateDto as any, { where: { guid: updateDto.guid } });
      const updatedPkg = await this.visaPackageRepository.findOne({ where: { guid: updateDto.guid } });

      return successResponse(HttpStatuses.OK, updatedPkg, 'Package updated successfully');
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Update error', error);
    }
  }

  async deleteVisaPackage(guid: string) {
    try {
      const deletedCount = await this.visaPackageRepository.destroy({ where: { guid } });
      if (deletedCount === 0) return errorResponse(HttpStatuses.NOT_FOUND, 'Package not found');

      return successResponse(HttpStatuses.OK, null, 'Package deleted successfully');
    } catch (error) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Delete error', error);
    }
  }
}