import { Test, TestingModule } from '@nestjs/testing';
import { TicketPaymentService } from './ticket_payment.service';

describe('TicketPaymentService', () => {
  let service: TicketPaymentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TicketPaymentService],
    }).compile();

    service = module.get<TicketPaymentService>(TicketPaymentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
