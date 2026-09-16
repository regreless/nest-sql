import { Module } from '@nestjs/common';
import { McpClientService } from './mcp-client.service';
import { McpClientController } from './mcp-client.controller';

@Module({
  controllers: [McpClientController],
  providers: [McpClientService],
})
export class McpClientModule {}
