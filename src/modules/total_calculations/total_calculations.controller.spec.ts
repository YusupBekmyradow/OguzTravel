import { Test, TestingModule } from '@nestjs/testing';
import { TotalCalculationsController } from './total_calculations.controller';
import { TotalCalculationsService } from './total_calculations.service';

describe('TotalCalculationsController', () => {
  let controller: TotalCalculationsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TotalCalculationsController],
      providers: [TotalCalculationsService],
    }).compile();

    controller = module.get<TotalCalculationsController>(TotalCalculationsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
