import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'

const server = new McpServer({
    name: 'Example MCP Server',
    description: 'An example MCP server implemented in TypeScript',
    version: '1.0.0'
})

import { handle_database_query } from './tools/database.tool'
import { handleFileOperation } from './tools/file.tool'
import { handleWeatherQuery } from './tools/weather.tool'
// 工具1： 查询数据库
server.registerTool(
    'queryDatabase',
    {
        description: 'Query the student table based on name and limit',
        inputSchema: z.object({
            name: z.string().optional().describe('The name of the student to search for (partial match)'),
            limit: z.number().int().positive().optional().describe('The maximum number of students to return (default: 10)')
        })
    },
    async args => {
        try {
            const result = await handle_database_query(args)
            return { content: [{ type: 'text', text: result }] }
        } catch (error: any) {
            console.error('Error handling database query:', error)
            return { content: [{ type: 'text', text: 'An error occurred while querying the database.' }] }
        }
    }
)
// 工具2 读文件的工具
server.registerTool(
    'readFile',
    {
        description: 'Read the contents of a file given its path',
        inputSchema: z.object({
            filePath: z.string().describe('The path to the file to read')
        })
    },
    async args => {
        const { filePath } = args
        try {
            const content = await handleFileOperation({ operation: 'read', filePath })
            return { content: [{ type: 'text', text: content }] }
        } catch (error: any) {
            console.error('Error reading file:', error)
            return { content: [{ type: 'text', text: 'An error occurred while reading the file.' }] }
        }
    }
)

// 工具3  天气查询
server.registerTool(
    'getWeather',
    {
        description: 'Get the current weather for a given location',
        inputSchema: z.object({
            location: z.string().describe('The location to get the weather for')
        })
    },
    async args => {
        const { location } = args
        const result = await handleWeatherQuery({ location })
        return { content: [{ type: 'text', text: result }] }
    }
)

async function startServer() {
    try {
        const transport = new StdioServerTransport()
        await server.connect(transport)
        console.log('MCP Server is running on port 3000')
    } catch (error) {
        console.error('Failed to start MCP Server:', error)
    }
}

startServer().catch(console.error)
