import { Module } from '@nestjs/common';
import { TstatusService } from './tstatus.service';
import { TstatusController } from './tstatus.controller';
import { SequelizeModule } from '@nestjs/sequelize';
import { Tstatus } from './entities/tstatus.entity';

@Module({
  imports:[
    SequelizeModule.forFeature([Tstatus])
  ],
  controllers: [TstatusController],
  providers: [TstatusService],
  exports: [TstatusService]
})
export class TstatusModule {}
