import { Module } from '@nestjs/common';
import { VisaPackageService } from './visa_package.service';
import { VisaPackageController } from './visa_package.controller';
import { SequelizeModule } from '@nestjs/sequelize';
import { VisaPackage } from './entities/visa_package.entity';
import { VisaCategory } from '../visa_category/entities/visa_category.entity';
import { Visa } from '../visa/entities/visa.entity';

@Module({
  imports: [
    SequelizeModule.forFeature([VisaPackage, VisaCategory, Visa])
  ],
  controllers: [VisaPackageController],
  providers: [VisaPackageService],
})
export class VisaPackageModule { }
