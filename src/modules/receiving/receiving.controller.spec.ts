import { Test, TestingModule } from '@nestjs/testing';
import { ReceivingController } from './receiving.controller';
import { ReceivingService } from './receiving.service';

describe('ReceivingController', () => {
  let controller: ReceivingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReceivingController],
      providers: [ReceivingService],
    }).compile();

    controller = module.get<ReceivingController>(ReceivingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
