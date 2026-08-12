import { Module } from '@nestjs/common';
import { CountryService } from './country.service';
import { CountryController } from './country.controller';
import { SequelizeModule } from '@nestjs/sequelize';
import { Country } from './entities/country.entity';
import { CustomField } from '../custom_field/entities/custom_field.entity';

@Module({
  imports: [
    SequelizeModule.forFeature([Country, CustomField]),
  ],
  controllers: [CountryController],
  providers: [CountryService],
  exports: [CountryService],
})
export class CountryModule {}
