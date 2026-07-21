import { Test, TestingModule } from '@nestjs/testing';
import { HarPaymentService } from './har_payment.service';

describe('HarPaymentService', () => {
  let service: HarPaymentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HarPaymentService],
    }).compile();

    service = module.get<HarPaymentService>(HarPaymentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
