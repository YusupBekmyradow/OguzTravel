import { Test, TestingModule } from '@nestjs/testing';
import { UserDatailsController } from './user_datails.controller';
import { UserDatailsService } from './user_datails.service';

describe('UserDatailsController', () => {
  let controller: UserDatailsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserDatailsController],
      providers: [UserDatailsService],
    }).compile();

    controller = module.get<UserDatailsController>(UserDatailsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
