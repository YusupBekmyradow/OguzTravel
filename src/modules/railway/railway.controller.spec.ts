import { Test, TestingModule } from '@nestjs/testing';
import { RailwayController } from './railway.controller';
import { RailwayService } from './railway.service';

describe('RailwayController', () => {
  let controller: RailwayController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RailwayController],
      providers: [RailwayService],
    }).compile();

    controller = module.get<RailwayController>(RailwayController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
