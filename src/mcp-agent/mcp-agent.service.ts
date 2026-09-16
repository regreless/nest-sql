import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { ChatOllama } from '@langchain/ollama'
import { AIMessage, HumanMessage, SystemMessage, ToolMessage } from '@langchain/core/messages'
import { MultiServerMCPClient } from '@langchain/mcp-adapters'
import { config } from '../config'

@Injectable()
export class McpAgentService implements OnModuleInit, OnModuleDestroy {
    // 创建 chatOllama 实例
    private llm = new ChatOllama({
        model: config.ollama.chatModel, // Ollama 模型名称
        temperature: config.ollama.temperature, // 生成文本的随机程度
        baseUrl: config.ollama.host, // Ollama 服务器地址
        think: false, // 是否开启思考模式，开启后模型会先返回一个思考中的消息，等生成完成后再返回最终回答
        numPredict: 512 // 生成文本的最大 token 数量，512 是一个比较合理的值，可以根据需要调整
    })
    // MultiServerMCPClient 是一个适配器，允许我们在 LangChain 中使用 MCP 协议与多个服务器进行通信。
    // 它提供了一个统一的接口，让我们可以轻松地调用不同服务器上的工具，而不需要关心底层的通信细节。
    private mcpClient: MultiServerMCPClient
    // 从mcp服务器获取工具列表的函数，返回一个包含工具信息的数组，每个工具信息包括工具的名称、描述和输入参数的模式
    private mcpTools: any[] = []
    // 模块启动初始化时创建MCP客户端连接，并从服务器获取工具列表
    async onModuleInit() {
        this.mcpClient = new MultiServerMCPClient({
            // 连接配置： 可以同时链接多个mcp服务器，
            // 这里以一个名为 local-tools 的服务器为例，实际使用中可以根据需要添加更多服务器
            mcpServers: {
                // 自定义本地的 mcp服务器，使用stdio方式通信，适用于与独立的MCP服务器进程通信
                'local-tools': {
                    transport: 'stdio',
                    command: 'ts-node',
                    args: ['src/mcp-server/server.ts'],
                    env: { ...process.env } as Record<string, string>
                }
                // 还可以添加其他服务器的连接配置，例如： 社区现场mcp服务
                // 'filesystem-tools': {
                //     transport: 'stdio',
                //     command: 'npx',
                //     args: ['src/mcp-server/filesystem-server.ts'],
                //     env: { ...process.env } as Record<string, string>,
                // }
            }
        })
        // 把所有mcp server的工具转成统一的格式（langchain tools的格式），存储在 mcpTools 变量中，方便后续调用
        this.mcpTools = await this.mcpClient.getTools()
        console.log('MCP Agent Service initialized with tools:', this.mcpTools)
    }

    // Agenet执行逻辑
    async runAgent(message: string) {
        if (!this.mcpTools.length) {
            return { error: 'No available tools' }
        }

        // bindTools 方法可以把工具绑定到 llm 上，这样模型在生成回答时就可以调用这些工具了，
        // 模型会根据用户的输入和对话的上下文来判断什么时候需要调用工具，以及调用哪个工具，并且把工具的输出结果整合到最终的回答中返回给用户
        // 注册成功后 模型回复里面会包含 tool_calls 字段，告诉我们模型调用了哪些工具，以及每个工具的输入参数是什么，我们就可以根据这个信息来调用对应的工具函数，获取工具的输出结果，然后把结果返回给模型，让模型继续生成回答
        const llmWithTools = this.llm.bindTools(this.mcpTools)
        // / 把工具列表转成一个映射表，方便根据工具名称找到对应的工具函数
        const toolMap = Object.fromEntries(this.mcpTools.map(tool => [tool.name, tool]))

        // 消息历史： Agent 每一轮都能看到 完整的对话 + 工具调用结果
        const messages: any[] = [
            // 设定系统角色，告诉模型它是一个智能客服助手，能够处理查询商品信息、创建订单、查询订单状态和申请退款等任务
            new SystemMessage(`你是一个智能助手，可以使用以下工具帮助用户：
                - queryDatabase：查询用户数据库
                - readFile：读取项目文件
                - getWeather：查询城市天气
                根据用户的问题，选择合适的工具获取信息后回答。用中文回答。`),
            new HumanMessage(message)
        ]

        // 记录一下每步执行的过程（用于前端展示 调试）
        const steps: string[] = []
        let roundCount = 0

        // 定义一个递归函数来处理模型的回答和工具调用
        while (roundCount < 6) {
            // 限制最大轮数，防止死循环
            roundCount++
            console.log(`Agent 演示----- 第${roundCount}轮:`)

            const response = await llmWithTools.invoke(messages)
            messages.push(response) // 把模型的回答添加到消息历史中，让模型在下一轮回答时可以看到之前的对话内容和工具调用结果
            // tool_calls 是模型回答里一个特殊的字段，
            // 表示模型在这一轮回答中调用了哪些工具，以及每个工具的输入参数是什么，
            // 我们可以根据这个信息来调用对应的工具函数，获取工具的输出结果，然后把结果返回给模型，让模型继续生成回答
            // 模型有了答案， 退出循环，返回结果给前端
            if (!response.tool_calls || response.tool_calls.length === 0) {
                steps.push(`【最终回答】模型回答: ${response.content}`)
                break
            }
            // 模型决定调用工具， 依次执行所有工具的调用
            for (const toolCall of response.tool_calls) {
                steps.push(`模型调用工具: ${toolCall.name}，输入参数: ${JSON.stringify(toolCall.args)}`)
                console.log('模型调用工具---', toolCall.name, toolCall.args)

                const toolFunc = toolMap[toolCall.name] // 从工具映射表中找到对应的工具函数
                if (!toolFunc) {
                    const errorMsg = `未找到工具函数: ${toolCall.name}`
                    steps.push(`【错误】${errorMsg}`)
                    messages.push(new ToolMessage({ content: errorMsg, tool_call_id: toolCall.id ?? '' })) // 把错误信息也添加到消息历史中，让模型知道发生了什么问题
                    continue
                }
                // 调用工具函数，获取结果
                const toolResult = await toolFunc.invoke(toolCall.args) // 调用工具函数，获取结果
                steps.push(`工具执行结果: ${toolResult}`)
                console.log('工具执行结果---', toolResult)

                // 把工具的结果作为新的消息添加到消息历史中，让模型在下一轮回答时可以看到这个结果
                messages.push(new ToolMessage({ content: String(toolResult), tool_call_id: toolCall.id ?? '' }))
            }
        }
        const finalResponse =
            [...messages].reverse().find(msg => msg instanceof AIMessage) || '很抱歉，我无法处理您的请求。'
        return {
            message,
            steps,
            totalRounds: roundCount,
            answer: finalResponse instanceof AIMessage ? finalResponse.content : finalResponse
        }
    }
    async listTools() {
        // 这里可以添加调用MCP服务器的逻辑，获取工具列表并返回
        return this.mcpTools.map(tool => ({
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema
        }))
    }
    async onModuleDestroy() {
        await this.mcpClient.close()
        // 这里可以添加清理MCP服务器连接的逻辑
        console.log('MCP Agent Service destroyed')
    }
}
