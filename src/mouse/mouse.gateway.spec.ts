import { Test, TestingModule } from '@nestjs/testing';
import { MouseGateway } from './mouse.gateway';
import { MouseService } from './mouse.service';

describe('MouseGateway', () => {
  let gateway: MouseGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MouseGateway, MouseService],
    }).compile();

    gateway = module.get<MouseGateway>(MouseGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
