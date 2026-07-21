import { Test, TestingModule } from '@nestjs/testing';
import { TtpPaymentService } from './ttp_payment.service';

describe('TtpPaymentService', () => {
  let service: TtpPaymentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TtpPaymentService],
    }).compile();

    service = module.get<TtpPaymentService>(TtpPaymentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
