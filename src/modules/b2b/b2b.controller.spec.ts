import { Test, TestingModule } from '@nestjs/testing';
import { B2bController } from './b2b.controller';
import { B2bService } from './b2b.service';

describe('B2bController', () => {
  let controller: B2bController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [B2bController],
      providers: [B2bService],
    }).compile();

    controller = module.get<B2bController>(B2bController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
