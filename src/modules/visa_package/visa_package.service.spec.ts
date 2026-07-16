import { Test, TestingModule } from '@nestjs/testing';
import { VisaPackageService } from './visa_package.service';

describe('VisaPackageService', () => {
  let service: VisaPackageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VisaPackageService],
    }).compile();

    service = module.get<VisaPackageService>(VisaPackageService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
