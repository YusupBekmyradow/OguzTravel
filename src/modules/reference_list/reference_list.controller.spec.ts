import { Test, TestingModule } from '@nestjs/testing';
import { ReferenceListController } from './reference_list.controller';
import { ReferenceListService } from './reference_list.service';

describe('ReferenceListController', () => {
  let controller: ReferenceListController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReferenceListController],
      providers: [ReferenceListService],
    }).compile();

    controller = module.get<ReferenceListController>(ReferenceListController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
