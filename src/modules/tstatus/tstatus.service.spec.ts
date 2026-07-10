import { Test, TestingModule } from '@nestjs/testing';
import { TstatusService } from './tstatus.service';

describe('TstatusService', () => {
  let service: TstatusService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TstatusService],
    }).compile();

    service = module.get<TstatusService>(TstatusService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
