import { Test, TestingModule } from '@nestjs/testing';
import { VisaCategoryController } from './visa_category.controller';
import { VisaCategoryService } from './visa_category.service';

describe('VisaCategoryController', () => {
  let controller: VisaCategoryController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VisaCategoryController],
      providers: [VisaCategoryService],
    }).compile();

    controller = module.get<VisaCategoryController>(VisaCategoryController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
