import { Test, TestingModule } from '@nestjs/testing';
import { TurkishAirlinesService } from './turkish_airlines.service';

describe('TurkishAirlinesService', () => {
  let service: TurkishAirlinesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TurkishAirlinesService],
    }).compile();

    service = module.get<TurkishAirlinesService>(TurkishAirlinesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
