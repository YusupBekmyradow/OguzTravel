import { Test, TestingModule } from '@nestjs/testing';
import { RailwayService } from './railway.service';

describe('RailwayService', () => {
  let service: RailwayService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RailwayService],
    }).compile();

    service = module.get<RailwayService>(RailwayService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
