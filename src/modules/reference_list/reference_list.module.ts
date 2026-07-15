import { Module } from '@nestjs/common';
import { ReferenceListService } from './reference_list.service';
import { ReferenceListController } from './reference_list.controller';
import { ReferenceList } from './entities/reference_list.entity';
import { SequelizeModule } from '@nestjs/sequelize';
import { OfficeModule } from '../office/office.module';
import { EmployeeModule } from '../employee/employee.module';
import { ClientModule } from '../client/client.module';

@Module({
  imports: [
    SequelizeModule.forFeature([ReferenceList]),
    EmployeeModule,
    ClientModule,
    OfficeModule
  ],
  controllers: [ReferenceListController],
  providers: [ReferenceListService],
  exports: [ReferenceListService]
})
export class ReferenceListModule { }
