import { Test, TestingModule } from '@nestjs/testing';
import { TransStatusController } from './trans_status.controller';
import { TransStatusService } from './trans_status.service';

describe('TransStatusController', () => {
  let controller: TransStatusController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransStatusController],
      providers: [TransStatusService],
    }).compile();

    controller = module.get<TransStatusController>(TransStatusController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
