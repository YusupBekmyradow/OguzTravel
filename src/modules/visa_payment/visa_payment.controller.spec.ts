import { Test, TestingModule } from '@nestjs/testing';
import { VisaPaymentController } from './visa_payment.controller';
import { VisaPaymentService } from './visa_payment.service';

describe('VisaPaymentController', () => {
  let controller: VisaPaymentController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VisaPaymentController],
      providers: [VisaPaymentService],
    }).compile();

    controller = module.get<VisaPaymentController>(VisaPaymentController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
