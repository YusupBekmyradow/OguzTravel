import { Module } from '@nestjs/common';
import { VisaService } from './visa.service';
import { VisaController } from './visa.controller';
import { SequelizeModule } from '@nestjs/sequelize';
import { Visa } from './entities/visa.entity';
import { ClientModule } from '../client/client.module';
import { Client } from '../client/entities/client.entity';

@Module({
  imports: [
    SequelizeModule.forFeature([Visa, Client]),
    ClientModule,
  ],
  controllers: [VisaController],
  providers: [VisaService],
  exports: [VisaService]
})
export class VisaModule { }
