import { Test, TestingModule } from '@nestjs/testing';
import { TotalCalculationsService } from './total_calculations.service';

describe('TotalCalculationsService', () => {
  let service: TotalCalculationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TotalCalculationsService],
    }).compile();

    service = module.get<TotalCalculationsService>(TotalCalculationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
