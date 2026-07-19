import { Test, TestingModule } from '@nestjs/testing';
import { AirwayService } from './airway.service';

describe('AirwayService', () => {
  let service: AirwayService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AirwayService],
    }).compile();

    service = module.get<AirwayService>(AirwayService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
