import { Test, TestingModule } from '@nestjs/testing';
import { GeneralTranslationController } from './general_translation.controller';
import { GeneralTranslationService } from './general_translation.service';

describe('GeneralTranslationController', () => {
  let controller: GeneralTranslationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GeneralTranslationController],
      providers: [GeneralTranslationService],
    }).compile();

    controller = module.get<GeneralTranslationController>(GeneralTranslationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
