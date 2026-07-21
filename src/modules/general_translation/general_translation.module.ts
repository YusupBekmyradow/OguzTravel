import { Module } from '@nestjs/common';
import { GeneralTranslationService } from './general_translation.service';
import { GeneralTranslationController } from './general_translation.controller';
import { SequelizeModule } from '@nestjs/sequelize';
import { GeneralTranslation } from './entities/general_translation.entity';
import { EmployeeModule } from '../employee/employee.module';
import { ClientModule } from '../client/client.module';
import { TranslatorModule } from '../translator/translator.module';
import { TransPayment } from '../trans_payment/entities/trans_payment.entity';

@Module({
  imports: [
    SequelizeModule.forFeature([GeneralTranslation, TransPayment]),
    EmployeeModule,
    ClientModule,
    TranslatorModule,
  ],
  controllers: [GeneralTranslationController],
  providers: [GeneralTranslationService],
  exports: [GeneralTranslationService]
})
export class GeneralTranslationModule { }
