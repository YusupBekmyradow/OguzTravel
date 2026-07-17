import { Test, TestingModule } from '@nestjs/testing';
import { RefferalLetterController } from './refferal_letter.controller';
import { RefferalLetterService } from './refferal_letter.service';

describe('RefferalLetterController', () => {
  let controller: RefferalLetterController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RefferalLetterController],
      providers: [RefferalLetterService],
    }).compile();

    controller = module.get<RefferalLetterController>(RefferalLetterController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
