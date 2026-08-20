import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { VisaDoc } from './entities/visa_doc.entity';
import { DocDetails } from './entities/doc_details.entity';
import { VisaDocsService } from './visa_doc.service';
import { VisaDocsController } from './visa_doc.controller';

@Module({
  imports: [SequelizeModule.forFeature([VisaDoc, DocDetails])],
  providers: [VisaDocsService],
  controllers: [VisaDocsController],
  exports: [VisaDocsService],
})
export class VisaDocsModule { }