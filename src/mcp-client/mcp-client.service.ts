import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { Client } from '@modelcontextprotocol/sdk/client'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
@Injectable()
export class McpClientService implements OnModuleInit, OnModuleDestroy {
    private client: Client
    private transport: StdioClientTransport

    // 模块初始化时创建MCP客户端连接
    async onModuleInit() {
        this.client = new Client({
            name: 'Example MCP Client',
            description: 'An example MCP client implemented in TypeScript',
            version: '1.0.0'
        })
        // stido 模式  适用于与独立的MCP服务器进程通信， 子进程模式 适用于在同一进程内运行MCP服务器
        this.transport = new StdioClientTransport({
            command: 'ts-node',
            args: ['src/mcp-server/server.ts'],
            env: { ...process.env } as Record<string, string>
        })
        await this.client.connect(this.transport)
        // 这里可以添加初始化MCP服务器连接的逻辑
        console.log('MCP Client Service initialized')
    }

    async listTools() {
        // 这里可以添加调用MCP服务器的逻辑，获取工具列表并返回
        const response = await this.client.listTools()

        return response.tools.map(tool => ({
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema
        }))
    }

    async callTool(toolName: string, args: Record<string, any>) {
        // 这里可以添加调用MCP服务器的逻辑，调用工具并返回结果
        const response = await this.client.callTool({
            name: toolName,
            arguments: args
        })
        // mcp 响应里面的 content 是一个数组，包含了工具调用的结果，可以根据需要进行处理
        // const content = response.content.find(item => item.type === 'text')?.text || 'No text content returned';
        console.log('Tool response:', response)
        return {
            toolName,
            isError: response.isError,
            content: response
        }
    }
    async onModuleDestroy() {
        await this.client.close()
        // 这里可以添加清理MCP服务器连接的逻辑
        console.log('MCP Client Service destroyed')
    }
}
