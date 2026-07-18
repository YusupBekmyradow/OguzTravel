import { Module } from '@nestjs/common';
import { GeneralTranslationService } from './general_translation.service';
import { GeneralTranslationController } from './general_translation.controller';
import { SequelizeModule } from '@nestjs/sequelize';
import { GeneralTranslation } from './entities/general_translation.entity';
import { EmployeeModule } from '../employee/employee.module';
import { ClientModule } from '../client/client.module';
import { TransStatusModule } from '../trans_status/trans_status.module';
import { TranslatorModule } from '../translator/translator.module';

@Module({
  imports: [
    SequelizeModule.forFeature([GeneralTranslation]),
    EmployeeModule,
    ClientModule,
    TransStatusModule,
    TranslatorModule,
  ],
  controllers: [GeneralTranslationController],
  providers: [GeneralTranslationService],
  exports: [GeneralTranslationService]
})
export class GeneralTranslationModule { }
