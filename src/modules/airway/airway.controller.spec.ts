import { Test, TestingModule } from '@nestjs/testing';
import { AirwayController } from './airway.controller';
import { AirwayService } from './airway.service';

describe('AirwayController', () => {
  let controller: AirwayController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AirwayController],
      providers: [AirwayService],
    }).compile();

    controller = module.get<AirwayController>(AirwayController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
