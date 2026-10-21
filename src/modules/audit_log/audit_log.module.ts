import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { AuditLog } from './entities/audit_log.entity';
import { AuditLogService } from './audit_log.service';
import { AuditLogController } from './audit_log.controller';
import { User } from '../user/entities/user.entity';
import { Employee } from '../employee/entities/employee.entity';

@Module({
  imports: [SequelizeModule.forFeature([AuditLog, User, Employee])],
  controllers: [AuditLogController],
  providers: [AuditLogService],
  exports: [AuditLogService],
})
export class AuditLogModule { }
