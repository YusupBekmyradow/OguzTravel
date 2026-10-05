import { CafeteriaModule } from './modules/cafeteria/cafeteria.module';
import { SalaryModule } from './modules/salary/salary.module';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SequelizeModule } from '@nestjs/sequelize';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { I18nModule, QueryResolver, AcceptLanguageResolver, HeaderResolver } from 'nestjs-i18n';
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
import { VisaPaymentModule } from './modules/visa_payment/visa_payment.module';
import { RefferalLetterModule } from './modules/refferal_letter/refferal_letter.module';
import { GeneralTranslationModule } from './modules/general_translation/general_translation.module';
import { TranslatorModule } from './modules/translator/translator.module';
import { TransPaymentModule } from './modules/trans_payment/trans_payment.module';
import { HotelModule } from './modules/hotel/hotel.module';
import { RailwayModule } from './modules/railway/railway.module';
import { AirwayModule } from './modules/airway/airway.module';
import { TourModule } from './modules/tour/tour.module';
import { TransferModule } from './modules/transfer/transfer.module';
import { PackageModule } from './modules/package/package.module';
import { HarPaymentModule } from './modules/har_payment/har_payment.module';
import { TtpPaymentModule } from './modules/ttp_payment/ttp_payment.module';
import { InboundModule } from './modules/inbound/inbound.module';
import { InboundReportModule } from './modules/inbound_report/inbound_report.module';
import { AllExceptionsFilter } from './filters/all-exceptions.filter';
import { APP_FILTER } from '@nestjs/core';
import { MessagesModule } from './modules/messages/messages.module';
import { ReportModule } from './modules/report/report.module';
import { ImageUploadModule } from './common/image-upload/image-upload.module';
import { CountryModule } from './modules/country/country.module';
import { JwtModule } from '@nestjs/jwt';
import { CustomFieldModule } from './modules/custom_field/custom_field.module';
import { ReceivingModule } from './modules/receiving/receiving.module';
import { VisaDocsModule } from './modules/visa_doc/visa_doc.module';
import { UserDatailsModule } from './modules/user_datails/user_datails.module';
import { TotalCalculation } from './modules/total_calculations/entities/total_calculation.entity';
import { TotalCalculationsModule } from './modules/total_calculations/total_calculations.module';
import { CategoryModule } from './modules/category/category.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { RefferalCountryModule } from './modules/refferal_country/refferal_country.module';
dotenv.config();

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    JwtModule.register({
      global: true,
      secret: process.env.ACCESS_TOKEN_SECRET || 'hsdfkjhsdjkfhskdjsdkfsdfsfd',
    }),
    I18nModule.forRoot({
      fallbackLanguage: 'tk',
      loaderOptions: {
        path: path.join(__dirname, '/i18n/'),
        watch: true,
      },
      resolvers: [
        new QueryResolver(['lang', 'l']),
        new HeaderResolver(['x-custom-lang', 'x-lang', 'lang']),
        new AcceptLanguageResolver(),
      ],
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
    VisaPaymentModule,
    RefferalLetterModule,
    TranslatorModule,
    GeneralTranslationModule,
    TransPaymentModule,
    HotelModule,
    AirwayModule,
    RailwayModule,
    TourModule,
    TransferModule,
    PackageModule,
    HarPaymentModule,
    TtpPaymentModule,
    InboundModule,
    InboundReportModule,
    MessagesModule,
    ReportModule,
    ImageUploadModule,
    CustomFieldModule,
    CountryModule,
    ReceivingModule,
    VisaDocsModule,
    UserDatailsModule,
    CafeteriaModule,
    TotalCalculationsModule,
    CategoryModule,
    SalaryModule,
    DashboardModule,
    RefferalCountryModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    }
  ],
})
export class AppModule { }