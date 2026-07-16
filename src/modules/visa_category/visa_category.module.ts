import { Module } from '@nestjs/common';
import { VisaCategoryService } from './visa_category.service';
import { VisaCategoryController } from './visa_category.controller';
import { SequelizeModule } from '@nestjs/sequelize';
import { VisaCategory } from './entities/visa_category.entity';

@Module({
  imports: [
    SequelizeModule.forFeature([VisaCategory])
  ],
  controllers: [VisaCategoryController],
  providers: [VisaCategoryService],
  exports: [VisaCategoryService]
})
export class VisaCategoryModule { }
