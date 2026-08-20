import { Test, TestingModule } from '@nestjs/testing';
import { VisaDocService } from './visa_doc.service';

describe('VisaDocService', () => {
  let service: VisaDocService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VisaDocService],
    }).compile();

    service = module.get<VisaDocService>(VisaDocService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
