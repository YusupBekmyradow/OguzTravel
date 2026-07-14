import { Module } from '@nestjs/common';
import { ReferenceListService } from './reference_list.service';
import { ReferenceListController } from './reference_list.controller';

@Module({
  controllers: [ReferenceListController],
  providers: [ReferenceListService],
})
export class ReferenceListModule {}
