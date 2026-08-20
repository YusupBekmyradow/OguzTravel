import { Test, TestingModule } from '@nestjs/testing';
import { VisaDocController } from './visa_doc.controller';
import { VisaDocService } from './visa_doc.service';

describe('VisaDocController', () => {
  let controller: VisaDocController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VisaDocController],
      providers: [VisaDocService],
    }).compile();

    controller = module.get<VisaDocController>(VisaDocController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
