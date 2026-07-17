import { Module } from '@nestjs/common';
import { TransStatusService } from './trans_status.service';
import { TransStatusController } from './trans_status.controller';
import { TransStatus } from './entities/trans_status.entity';
import { SequelizeModule } from '@nestjs/sequelize';

@Module({
  imports: [
    SequelizeModule.forFeature([TransStatus])
  ],
  controllers: [TransStatusController],
  providers: [TransStatusService],
})
export class TransStatusModule { }
