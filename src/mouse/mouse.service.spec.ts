import { Test, TestingModule } from '@nestjs/testing';
import { MouseService } from './mouse.service';

describe('MouseService', () => {
  let service: MouseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MouseService],
    }).compile();

    service = module.get<MouseService>(MouseService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
