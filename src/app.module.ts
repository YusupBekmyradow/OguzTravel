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
    AuthModule
  ],
  controllers: [AppController],
  providers: [
    AppService
  ],
})
export class AppModule {}