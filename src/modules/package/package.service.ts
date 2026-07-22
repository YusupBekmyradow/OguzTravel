import { Injectable } from '@nestjs/common';
import { CreatePackageDto } from './dto/create-package.dto';
import { UpdatePackageDto } from './dto/update-package.dto';
import { InjectModel } from '@nestjs/sequelize';
import { Package } from './entities/package.entity';
import { Employee } from '../employee/entities/employee.entity';
import { Office } from '../office/entities/office.entity';
import { Client } from '../client/entities/client.entity';
import { errorResponse, successResponse } from '../../helpers/responseFunctions';
import { HttpStatuses } from '../../helpers/httpStatuses.enum';
import { TtpPayment } from '../ttp_payment/entities/ttp_payment.entity';
import { Sequelize } from 'sequelize-typescript';

@Injectable()
export class PackageService {
  constructor(
    @InjectModel(Package) private packageRepository: typeof Package,
    @InjectModel(TtpPayment) private ttpPaymentRepo: typeof TtpPayment,
    private sequelize: Sequelize
    ,
  ) { }

  private getIncludes() {
    return [
      {
        model: Employee, as: 'operator', attributes: ['guid', 'fullName'],
        include: [{ model: Office, attributes: ['guid', 'fullName', 'shortName'] }]
      },
      { model: Client, attributes: ['guid', 'fullName'] },
      { model: Employee, as: 'preparedOpr', attributes: ['guid', 'fullName'] },
    ];
  }

  private getAttributes() {
    return {
      include: [
        [
          Sequelize.literal(`(
            SELECT ROUND(COALESCE(SUM(amount), 0)::numeric, 2)
            FROM "tbl_TTP_payments" AS tp
            WHERE tp.package_guid = "Package"."guid"
          )`),
          'totalPaid'
        ],
        [
          Sequelize.literal(`(
            SELECT 
              CASE 
                WHEN SUM(tp.amount) IS NULL OR SUM(tp.amount) = 0 THEN '0%'
                WHEN "Package".price > 0 
                THEN CONCAT(ROUND(((SUM(tp.amount) / "Package".price) * 100)::numeric, 2), '%')
                ELSE '100%' 
              END
            FROM "tbl_TTP_payments" AS tp
            WHERE tp.package_guid = "Package"."guid"
          )`),
          'paidPercentage'
        ]
      ]
    };
  }

  async addPackage(createDto: CreatePackageDto) {
    const t = await this.sequelize.transaction();
    try {
      const packageItem = await this.packageRepository.create({ ...createDto } as any, { hooks: true, transaction: t });
      if (createDto.is_paid === true) {
        await this.ttpPaymentRepo.create({
          package_guid: packageItem.guid,
          amount: packageItem.price || 0,
          payment_date: new Date(),
          opr_guid: createDto.opr_guid
        } as any, { transaction: t });
      }
      await t.commit();
      const newPackage = await this.packageRepository.findOne({
        where: { guid: packageItem.guid },
        attributes: {
          exclude: ['opr_guid', 'client_guid', 'prepared_opr_guid'],
          include: this.getAttributes().include as any
        },
        include: this.getIncludes()
      });
      return { status: 201, data: newPackage, message: 'Package created successfully' };
    } catch (error: any) {
      await t.rollback();
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Package creation failed', error);
    }
  }

  async getAllPackage(page: number = 1, limit: number = 10) {
    try {
      const currentPage = Math.max(1, Number(page));
      const currentLimit = Math.max(1, Number(limit));
      const offset = (currentPage - 1) * currentLimit;

      const { rows, count } = await this.packageRepository.findAndCountAll({
        attributes: {
          exclude: ['opr_guid', 'client_guid', 'prepared_opr_guid'],
          include: this.getAttributes().include as any
        },
        include: this.getIncludes(),
        order: [['index_number', 'DESC']],
        limit: currentLimit,
        offset: offset,
      });
      return {
        status: 200,
        data: rows,
        meta: { totalItems: count, totalPages: Math.ceil(count / currentLimit), currentPage },
        message: 'Package records fetched successfully'
      };
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Package fetching error', error);
    }
  }

  async updatePackage(updateDto: UpdatePackageDto) {
    try {
      const packageItem = await this.packageRepository.findOne({
        where: { guid: updateDto.guid }
      });

      if (!packageItem) {
        return errorResponse(HttpStatuses.NOT_FOUND, 'Package not found');
      }
      await packageItem.update(updateDto, { hooks: true });
      const updatedPackage = await this.packageRepository.findOne({
        where: { guid: updateDto.guid },
        attributes: {
          exclude: ['opr_guid', 'client_guid', 'prepared_opr_guid'],
          include: this.getAttributes().include as any
        },
        include: this.getIncludes()
      });

      return { status: 200, data: updatedPackage, message: 'Package updated successfully' };
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Update failed', error);
    }
  }

  async deletePackage(guid: string) {
    try {
      const packageItem = await this.packageRepository.findByPk(guid);
      if (!packageItem) return errorResponse(HttpStatuses.NOT_FOUND, 'Package not found');
      await packageItem.destroy();
      return successResponse(HttpStatuses.OK, null, 'Package deleted successfully');
    } catch (error: any) {
      return errorResponse(HttpStatuses.INTERNAL_SERVER_ERROR, 'Deletion failed', error);
    }
  }
}