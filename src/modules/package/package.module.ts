import { Module } from '@nestjs/common';
import { PackageService } from './package.service';
import { PackageController } from './package.controller';
import { SequelizeModule } from '@nestjs/sequelize';
import { Package } from './entities/package.entity';

@Module({
  imports: [
    SequelizeModule.forFeature([Package])
  ],
  controllers: [PackageController],
  providers: [PackageService],
  exports: [PackageService],
})
export class PackageModule { }
