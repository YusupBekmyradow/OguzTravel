import { Test, TestingModule } from '@nestjs/testing';
import { ReferenceListService } from './reference_list.service';

describe('ReferenceListService', () => {
  let service: ReferenceListService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReferenceListService],
    }).compile();

    service = module.get<ReferenceListService>(ReferenceListService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
