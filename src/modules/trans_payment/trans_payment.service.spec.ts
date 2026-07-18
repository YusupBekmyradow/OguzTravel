import { Test, TestingModule } from '@nestjs/testing';
import { TransPaymentService } from './trans_payment.service';

describe('TransPaymentService', () => {
  let service: TransPaymentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TransPaymentService],
    }).compile();

    service = module.get<TransPaymentService>(TransPaymentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
