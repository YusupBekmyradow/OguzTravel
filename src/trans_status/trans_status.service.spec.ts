import { Test, TestingModule } from '@nestjs/testing';
import { TransStatusService } from './trans_status.service';

describe('TransStatusService', () => {
  let service: TransStatusService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TransStatusService],
    }).compile();

    service = module.get<TransStatusService>(TransStatusService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
