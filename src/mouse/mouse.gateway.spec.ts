import { Test, TestingModule } from '@nestjs/testing';
import { MouseGateway } from './mouse.gateway';

describe('MouseGateway', () => {
  let gateway: MouseGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MouseGateway],
    }).compile();

    gateway = module.get<MouseGateway>(MouseGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
