import { Test, TestingModule } from '@nestjs/testing';
import { TtpPaymentController } from './ttp_payment.controller';
import { TtpPaymentService } from './ttp_payment.service';

describe('TtpPaymentController', () => {
  let controller: TtpPaymentController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TtpPaymentController],
      providers: [TtpPaymentService],
    }).compile();

    controller = module.get<TtpPaymentController>(TtpPaymentController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
