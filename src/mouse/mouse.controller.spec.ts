import { Test, TestingModule } from '@nestjs/testing';
import { MouseController } from './mouse.controller';
import { MouseService } from './mouse.service';

describe('MouseController', () => {
  let controller: MouseController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MouseController],
      providers: [MouseService],
    }).compile();

    controller = module.get<MouseController>(MouseController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
