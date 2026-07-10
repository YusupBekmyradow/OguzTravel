import { Test, TestingModule } from '@nestjs/testing';
import { TstatusController } from './tstatus.controller';
import { TstatusService } from './tstatus.service';

describe('TstatusController', () => {
  let controller: TstatusController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TstatusController],
      providers: [TstatusService],
    }).compile();

    controller = module.get<TstatusController>(TstatusController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
