import { Test, TestingModule } from '@nestjs/testing';
import { UserDatailsService } from './user_datails.service';

describe('UserDatailsService', () => {
  let service: UserDatailsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserDatailsService],
    }).compile();

    service = module.get<UserDatailsService>(UserDatailsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
