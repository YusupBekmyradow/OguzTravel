import { Test, TestingModule } from '@nestjs/testing';
import { HarPaymentController } from './har_payment.controller';
import { HarPaymentService } from './har_payment.service';

describe('HarPaymentController', () => {
  let controller: HarPaymentController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HarPaymentController],
      providers: [HarPaymentService],
    }).compile();

    controller = module.get<HarPaymentController>(HarPaymentController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
