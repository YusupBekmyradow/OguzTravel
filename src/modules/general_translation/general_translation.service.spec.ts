import { Test, TestingModule } from '@nestjs/testing';
import { GeneralTranslationService } from './general_translation.service';

describe('GeneralTranslationService', () => {
  let service: GeneralTranslationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GeneralTranslationService],
    }).compile();

    service = module.get<GeneralTranslationService>(GeneralTranslationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
