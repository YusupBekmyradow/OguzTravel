import { Test, TestingModule } from '@nestjs/testing';
import { TransPaymentController } from './trans_payment.controller';
import { TransPaymentService } from './trans_payment.service';

describe('TransPaymentController', () => {
  let controller: TransPaymentController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransPaymentController],
      providers: [TransPaymentService],
    }).compile();

    controller = module.get<TransPaymentController>(TransPaymentController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
