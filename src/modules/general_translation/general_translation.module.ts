import { Module } from '@nestjs/common';
import { GeneralTranslationService } from './general_translation.service';
import { GeneralTranslationController } from './general_translation.controller';
import { SequelizeModule } from '@nestjs/sequelize';
import { GeneralTranslation } from './entities/general_translation.entity';

@Module({
  imports: [
    SequelizeModule.forFeature([GeneralTranslation])
  ],
  controllers: [GeneralTranslationController],
  providers: [GeneralTranslationService],
})
export class GeneralTranslationModule { }
