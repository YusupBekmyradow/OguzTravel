import { Module } from '@nestjs/common';
import { ReportShareService } from './report_share.service';
import { ReportShareController } from './report_share.controller';
import { SequelizeModule } from '@nestjs/sequelize';
import { ReportShare } from './entities/report_share.entity';
import { Report } from '../report/entities/report.entity';

@Module({
  imports: [
    SequelizeModule.forFeature([ReportShare, Report])
  ],
  controllers: [ReportShareController],
  providers: [ReportShareService],
  exports: [ReportShareService],
})
export class ReportShareModule { }
