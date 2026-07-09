import { Module } from '@nestjs/common';
import { PositionService } from './position.service';
import { PositionController } from './position.controller';
import { SequelizeModule } from '@nestjs/sequelize';
import { Position } from './entities/position.entity';

@Module({
  imports: [
    SequelizeModule.forFeature([Position])
  ],
  controllers: [PositionController],
  providers: [PositionService],
  exports: [PositionService]
})
export class PositionModule {}