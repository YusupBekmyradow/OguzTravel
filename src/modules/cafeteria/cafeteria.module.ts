import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Cafeteria } from './entities/cafeteria.entity';
import { CafeteriaService } from './cafeteria.service';
import { CafeteriaController } from './cafeteria.controller';
import { User } from '../user/entities/user.entity';
import { Employee } from '../employee/entities/employee.entity';

@Module({
  imports: [SequelizeModule.forFeature([Cafeteria, User, Employee])],
  controllers: [CafeteriaController],
  providers: [CafeteriaService],
  exports: [CafeteriaService],
})
export class CafeteriaModule {}
