import { Module } from '@nestjs/common';
import { RagDbService } from './rag-db.service';
import { RagDbController } from './rag-db.controller';

@Module({
  controllers: [RagDbController],
  providers: [RagDbService],
})
export class RagDbModule {}
