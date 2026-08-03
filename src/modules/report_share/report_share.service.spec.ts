import { Test, TestingModule } from '@nestjs/testing';
import { ReportShareService } from './report_share.service';

describe('ReportShareService', () => {
  let service: ReportShareService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReportShareService],
    }).compile();

    service = module.get<ReportShareService>(ReportShareService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
