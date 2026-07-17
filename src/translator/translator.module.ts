import { Module } from '@nestjs/common';
import { TranslatorService } from './translator.service';
import { TranslatorController } from './translator.controller';
import { Translator } from './entities/translator.entity';
import { SequelizeModule } from '@nestjs/sequelize';

@Module({
  imports: [SequelizeModule.forFeature([Translator])],
  controllers: [TranslatorController],
  providers: [TranslatorService],
})
export class TranslatorModule { }
