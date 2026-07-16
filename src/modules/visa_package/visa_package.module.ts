import { Module } from '@nestjs/common';
import { VisaPackageService } from './visa_package.service';
import { VisaPackageController } from './visa_package.controller';
import { SequelizeModule } from '@nestjs/sequelize';
import { VisaPackage } from './entities/visa_package.entity';

@Module({
  imports: [
    SequelizeModule.forFeature([VisaPackage])
  ],
  controllers: [VisaPackageController],
  providers: [VisaPackageService],
})
export class VisaPackageModule { }
