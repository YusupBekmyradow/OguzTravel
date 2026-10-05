import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { InboundExpected } from './entities/inbound-expected.entity';
import { InboundArrival } from './entities/inbound-arrival.entity';
import { InboundInvitation } from './entities/inbound-invitation.entity';
import { InboundReportService } from './inbound_report.service';
import { InboundReportController } from './inbound_report.controller';

@Module({
  imports: [SequelizeModule.forFeature([InboundExpected, InboundArrival, InboundInvitation])],
  controllers: [InboundReportController],
  providers: [InboundReportService],
  exports: [InboundReportService],
})
export class InboundReportModule { }
