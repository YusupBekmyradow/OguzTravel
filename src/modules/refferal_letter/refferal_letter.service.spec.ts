import { Test, TestingModule } from '@nestjs/testing';
import { RefferalLetterService } from './refferal_letter.service';

describe('RefferalLetterService', () => {
  let service: RefferalLetterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RefferalLetterService],
    }).compile();

    service = module.get<RefferalLetterService>(RefferalLetterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
