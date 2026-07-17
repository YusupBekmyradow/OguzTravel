import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SequelizeModule } from '@nestjs/sequelize';
import * as dotenv from 'dotenv';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { databaseConfig } from './config/database.config';
import { UserModule } from './modules/user/user.module';
import { OfficeModule } from './modules/office/office.module';
import { DepartmentModule } from './modules/department/department.module';
import { PositionModule } from './modules/position/position.module';
import { EmployeeModule } from './modules/employee/employee.module';
import { ClientModule } from './modules/client/client.module';
import { AuthModule } from './modules/auth/auth.module';
import { B2bModule } from './modules/b2b/b2b.module';
import { TstatusModule } from './modules/tstatus/tstatus.module';
import { TurkishAirlinesModule } from './modules/turkish_airlines/turkish_airlines.module';
import { TicketPaymentModule } from './modules/ticket_payment/ticket_payment.module';
import { VisaModule } from './modules/visa/visa.module';
import { TurkishPaymentModule } from './modules/turkish_payment/turkish_payment.module';
import { VisaCategoryModule } from './modules/visa_category/visa_category.module';
import { VisaPackageModule } from './modules/visa_package/visa_package.module';
import { VisaPaymentModule } from './modules/visa_payment/visa_payment.module';
import { RefferalLetterModule } from './modules/refferal_letter/refferal_letter.module';
import { TransStatusModule } from './trans_status/trans_status.module';
import { TranslatorModule } from './translator/translator.module';
import { GeneralTranslationModule } from './modules/general_translation/general_translation.module';
dotenv.config();

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    SequelizeModule.forRootAsync({
      useFactory: databaseConfig,
    }),
    UserModule,
    OfficeModule,
    DepartmentModule,
    PositionModule,
    EmployeeModule,
    ClientModule,
    AuthModule,
    TstatusModule,
    B2bModule,
    TurkishAirlinesModule,
    TicketPaymentModule,
    VisaModule,
    TurkishPaymentModule,
    VisaCategoryModule,
    VisaPackageModule,
    VisaPaymentModule,
    RefferalLetterModule,
    TransStatusModule,
    TranslatorModule,
    GeneralTranslationModule
  ],
  controllers: [AppController],
  providers: [
    AppService
  ],
})
export class AppModule { }