import { Test, TestingModule } from '@nestjs/testing';
import { TurkishPaymentController } from './turkish_payment.controller';
import { TurkishPaymentService } from './turkish_payment.service';

describe('TurkishPaymentController', () => {
  let controller: TurkishPaymentController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TurkishPaymentController],
      providers: [TurkishPaymentService],
    }).compile();

    controller = module.get<TurkishPaymentController>(TurkishPaymentController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
