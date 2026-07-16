import { Test, TestingModule } from '@nestjs/testing';
import { TurkishPaymentService } from './turkish_payment.service';

describe('TurkishPaymentService', () => {
  let service: TurkishPaymentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TurkishPaymentService],
    }).compile();

    service = module.get<TurkishPaymentService>(TurkishPaymentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
