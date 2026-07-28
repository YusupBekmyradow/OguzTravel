import { Module } from '@nestjs/common';
import { InboundService } from './inbound.service';
import { InboundController } from './inbound.controller';
import { SequelizeModule } from '@nestjs/sequelize';
import { Inbound } from './entities/inbound.entity';

@Module({
  imports: [
    SequelizeModule.forFeature([Inbound])
  ],
  controllers: [InboundController],
  providers: [InboundService],
  exports: [InboundService]
})
export class InboundModule { }
