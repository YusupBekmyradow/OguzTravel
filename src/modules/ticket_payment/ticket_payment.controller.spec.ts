import { Test, TestingModule } from '@nestjs/testing';
import { TicketPaymentController } from './ticket_payment.controller';
import { TicketPaymentService } from './ticket_payment.service';

describe('TicketPaymentController', () => {
  let controller: TicketPaymentController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TicketPaymentController],
      providers: [TicketPaymentService],
    }).compile();

    controller = module.get<TicketPaymentController>(TicketPaymentController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
