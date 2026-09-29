import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { RefferalCountry } from './entities/refferal_country.entity';
import { RefferalCountryService } from './refferal_country.service';
import { RefferalCountryController } from './refferal_country.controller';

@Module({
  imports: [SequelizeModule.forFeature([RefferalCountry])],
  controllers: [RefferalCountryController],
  providers: [RefferalCountryService],
  exports: [RefferalCountryService, SequelizeModule],
})
export class RefferalCountryModule { }
