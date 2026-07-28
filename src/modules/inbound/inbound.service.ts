import { Injectable } from '@nestjs/common';
import { CreateInboundDto } from './dto/create-inbound.dto';
import { UpdateInboundDto } from './dto/update-inbound.dto';

@Injectable()
export class InboundService {
  create(createInboundDto: CreateInboundDto) {
    return 'This action adds a new inbound';
  }

  findAll(page: number, limit: number) {
    return `This action returns all inbound`;
  }

  findOne() {
    return `This action returns a # inbound`;
  }

  update(updateInboundDto: UpdateInboundDto) {
    return `This action updates a inbound`;
  }

  remove(guid: string) {
    return `This action removes a inbound`;
  }
}
