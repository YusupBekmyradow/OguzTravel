import { forwardRef, Module } from '@nestjs/common';
import { EmployeeService } from './employee.service';
import { EmployeeController } from './employee.controller';
import { Employee } from './entities/employee.entity';
import { OfficeModule } from '../office/office.module';
import { PositionModule } from '../position/position.module';
import { DepartmentModule } from '../department/department.module';
import { SequelizeModule } from '@nestjs/sequelize';
import { Position } from '../position/entities/position.entity';

@Module({
  imports: [
    SequelizeModule.forFeature([Employee,Position]),
    OfficeModule,
    PositionModule,
    DepartmentModule
  ],
  controllers: [EmployeeController],
  providers: [EmployeeService],
  exports: [EmployeeService]
})
export class EmployeeModule { }
