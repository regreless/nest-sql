// src/mcp-agent/mcp-agent.controller.ts

import { Controller, Post, Get, Body } from '@nestjs/common'
import { McpAgentService } from './mcp-agent.service'

@Controller('mcp-agent')
export class McpAgentController {
    constructor(private readonly mcpAgentService: McpAgentService) {}

    @Post('run')
    runAgent(@Body() body: { message: string }) {
        return this.mcpAgentService.runAgent(body.message)
    }

    // 获取工具列表的接口
    @Get('tools')
    listTools() {
        return this.mcpAgentService.listTools()
    }
}
