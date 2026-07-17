import { Test, TestingModule } from '@nestjs/testing';
import { VisaPaymentService } from './visa_payment.service';

describe('VisaPaymentService', () => {
  let service: VisaPaymentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VisaPaymentService],
    }).compile();

    service = module.get<VisaPaymentService>(VisaPaymentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
