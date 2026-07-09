import { Module } from '@nestjs/common';
import { OfficeService } from './office.service';
import { OfficeController } from './office.controller';
import { SequelizeModule } from '@nestjs/sequelize';
import { Office } from './entities/office.entity';

@Module({
  imports: [
    SequelizeModule.forFeature([Office])
  ],  
  controllers: [OfficeController],
  providers: [OfficeService],
  exports: [OfficeService]
})
export class OfficeModule {}
