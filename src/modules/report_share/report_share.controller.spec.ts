import { Test, TestingModule } from '@nestjs/testing';
import { ReportShareController } from './report_share.controller';
import { ReportShareService } from './report_share.service';

describe('ReportShareController', () => {
  let controller: ReportShareController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportShareController],
      providers: [ReportShareService],
    }).compile();

    controller = module.get<ReportShareController>(ReportShareController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
