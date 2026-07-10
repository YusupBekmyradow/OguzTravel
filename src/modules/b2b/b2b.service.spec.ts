import { Test, TestingModule } from '@nestjs/testing';
import { B2bService } from './b2b.service';

describe('B2bService', () => {
  let service: B2bService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [B2bService],
    }).compile();

    service = module.get<B2bService>(B2bService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
