import { Test, TestingModule } from '@nestjs/testing';
import { McpClientController } from './mcp-client.controller';
import { McpClientService } from './mcp-client.service';

describe('McpClientController', () => {
  let controller: McpClientController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [McpClientController],
      providers: [McpClientService],
    }).compile();

    controller = module.get<McpClientController>(McpClientController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
