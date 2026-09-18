import { Test, TestingModule } from '@nestjs/testing';
import { TechResearchController } from './tech-research.controller';
import { TechResearchService } from './tech-research.service';

describe('TechResearchController', () => {
  let controller: TechResearchController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TechResearchController],
      providers: [TechResearchService],
    }).compile();

    controller = module.get<TechResearchController>(TechResearchController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
