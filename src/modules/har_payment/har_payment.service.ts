import { Injectable } from '@nestjs/common';
import { CreateHarPaymentDto } from './dto/create-har_payment.dto';
import { UpdateHarPaymentDto } from './dto/update-har_payment.dto';

@Injectable()
export class HarPaymentService {
  create(createHarPaymentDto: CreateHarPaymentDto) {
    return 'This action adds a new harPayment';
  }

  findAll() {
    return `This action returns all harPayment`;
  }

  findOne(id: number) {
    return `This action returns a #${id} harPayment`;
  }

  update(id: number, updateHarPaymentDto: UpdateHarPaymentDto) {
    return `This action updates a #${id} harPayment`;
  }

  remove(id: number) {
    return `This action removes a #${id} harPayment`;
  }
}
