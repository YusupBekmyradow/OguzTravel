import { Test, TestingModule } from '@nestjs/testing';
import { VisaPackageController } from './visa_package.controller';
import { VisaPackageService } from './visa_package.service';

describe('VisaPackageController', () => {
  let controller: VisaPackageController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VisaPackageController],
      providers: [VisaPackageService],
    }).compile();

    controller = module.get<VisaPackageController>(VisaPackageController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
