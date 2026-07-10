import { forwardRef, Module } from '@nestjs/common';
import { EmployeeService } from './employee.service';
import { EmployeeController } from './employee.controller';
import { Employee } from './entities/employee.entity';
import { OfficeModule } from '../office/office.module';
import { PositionModule } from '../position/position.module';
import { DepartmentModule } from '../department/department.module';
import { SequelizeModule } from '@nestjs/sequelize';

@Module({
  imports: [
    SequelizeModule.forFeature([Employee]),
    forwardRef(() => OfficeModule),
    forwardRef(() => PositionModule),
    forwardRef(() => DepartmentModule),
  ],
  controllers: [EmployeeController],
  providers: [EmployeeService],
  exports: [EmployeeModule]
})
export class EmployeeModule { }
