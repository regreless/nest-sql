import { Test, TestingModule } from '@nestjs/testing';
import { LanggraphController } from './langgraph.controller';
import { LanggraphModule } from './langgraph.module';

describe('LanggraphController', () => {
  let controller: LanggraphController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [LanggraphModule],
    }).compile();

    controller = module.get<LanggraphController>(LanggraphController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
