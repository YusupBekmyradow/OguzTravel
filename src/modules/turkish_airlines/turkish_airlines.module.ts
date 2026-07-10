import { Module } from '@nestjs/common';
import { TurkishAirlinesService } from './turkish_airlines.service';
import { TurkishAirlinesController } from './turkish_airlines.controller';

@Module({
  controllers: [TurkishAirlinesController],
  providers: [TurkishAirlinesService],
})
export class TurkishAirlinesModule {}
