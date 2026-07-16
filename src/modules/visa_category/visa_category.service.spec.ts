import { Test, TestingModule } from '@nestjs/testing';
import { VisaCategoryService } from './visa_category.service';

describe('VisaCategoryService', () => {
  let service: VisaCategoryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VisaCategoryService],
    }).compile();

    service = module.get<VisaCategoryService>(VisaCategoryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
