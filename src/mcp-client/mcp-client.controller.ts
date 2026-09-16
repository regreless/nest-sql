import { Body, Controller, Get, Post } from '@nestjs/common'
import { McpClientService } from './mcp-client.service'

@Controller('mcp-client')
export class McpClientController {
    constructor(private readonly mcpClientService: McpClientService) {}

    // 获取工具列表的接口
    @Get('tools')
    listTools() {
        // 这里可以添加调用MCP服务器的逻辑，获取工具列表并返回
        return this.mcpClientService.listTools()
    }

    // 调用工具的接口
    @Post('call-tool')
    callTool(@Body() body: { toolName: string; args: Record<string, any> }) {
        // 这里可以添加调用MCP服务器的逻辑，调用工具并返回结果
        return this.mcpClientService.callTool(body.toolName, body.args)
    }
}
