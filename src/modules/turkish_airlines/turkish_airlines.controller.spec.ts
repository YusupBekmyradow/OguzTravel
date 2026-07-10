import { Test, TestingModule } from '@nestjs/testing';
import { TurkishAirlinesController } from './turkish_airlines.controller';
import { TurkishAirlinesService } from './turkish_airlines.service';

describe('TurkishAirlinesController', () => {
  let controller: TurkishAirlinesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TurkishAirlinesController],
      providers: [TurkishAirlinesService],
    }).compile();

    controller = module.get<TurkishAirlinesController>(TurkishAirlinesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
