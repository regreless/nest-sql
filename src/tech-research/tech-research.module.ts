import { Module } from '@nestjs/common';
import { TechResearchService } from './tech-research.service';
import { TechResearchController } from './tech-research.controller';

@Module({
  controllers: [TechResearchController],
  providers: [TechResearchService],
})
export class TechResearchModule {}
