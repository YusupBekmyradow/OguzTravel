import { Injectable } from '@nestjs/common';
import { CreateTtpPaymentDto } from './dto/create-ttp_payment.dto';
import { UpdateTtpPaymentDto } from './dto/update-ttp_payment.dto';

@Injectable()
export class TtpPaymentService {
  create(createTtpPaymentDto: CreateTtpPaymentDto) {
    return 'This action adds a new ttpPayment';
  }

  findAll() {
    return `This action returns all ttpPayment`;
  }

  findOne(id: number) {
    return `This action returns a #${id} ttpPayment`;
  }

  update(id: number, updateTtpPaymentDto: UpdateTtpPaymentDto) {
    return `This action updates a #${id} ttpPayment`;
  }

  remove(id: number) {
    return `This action removes a #${id} ttpPayment`;
  }
}
