import { Injectable, OnModuleInit } from '@nestjs/common'
import { ChatOllama } from '@langchain/ollama'
import { StateGraph, Annotation, START, END } from '@langchain/langgraph'
import { config } from '../config'
import { HumanMessage } from '@langchain/core/messages'
const RoutingState = Annotation.Root({
    userInput: Annotation<string>(),
    category: Annotation<string>(), // classify写入， 路由函数读取
    response: Annotation<string>() // 各处理节点计入
})

@Injectable()
export class RoutingService implements OnModuleInit {
    private graph: any
    onModuleInit() {
        // 创建 chatOllama 实例
        const llm = new ChatOllama({
            model: config.ollama.chatModel, // Ollama 模型名称
            temperature: config.ollama.temperature, // 生成文本的随机程度
            baseUrl: config.ollama.host, // Ollama 服务器地址
            think: false, // 是否开启思考模式，开启后模型会先返回一个思考中的消息，等生成完成后再返回最终回答
            numPredict: 512 // 生成文本的最大 token 数量，512 是一个比较合理的值，可以根据需要调整
        })

        const classify = async (state: typeof RoutingState.State) => {
            const res = await llm.invoke([
                new HumanMessage(`把用户问题分类， 只输出类别名， 不要其他的内容：
                    - technical(技术、编程相关问题)
                    - pricing（价格 费用问题）
                    - general（其他一般性问题）
                    用户问题：${state.userInput}
                `)
            ])
            const category = (res.content as string).trim().toLowerCase()
            const valid = ['technical', 'pricing', 'general']
            return { category: valid.includes(category) ? category : 'general' }
        }

        // 路由函数 根据 state.category 的值决定下一步执行哪个节点
        const routeByCategory = (state: typeof RoutingState.State) => state.category

        const makeHandler = (systemPrompt: string) => async (state: typeof RoutingState.State) => {
            const res = await llm.invoke([new HumanMessage(`${systemPrompt} /n/n 用户问题：${state.userInput}`)])
            return { response: res.content as string }
        }

        this.graph = new StateGraph(RoutingState)
            .addNode('classify', classify)
            .addNode('technical', makeHandler('你是技术专家，专门回答技术相关问题'))
            .addNode('pricing', makeHandler('你是商务专员，友好地回答价格相关问题，具体价格引导dawei@company.com'))
            .addNode('general', makeHandler('你是客服专家，友好回答用户的问题'))
            .addEdge(START, 'classify')
            .addConditionalEdges('classify', routeByCategory, {
                technical: 'technical',
                pricing: 'pricing',
                general: 'general'
            })
            .addEdge('technical', END)
            .addEdge('pricing', END)
            .addEdge('general', END)
            .compile()
    }

    async routeChat(input: string) {
        const res = await this.graph.invoke({ userInput: input })
        return {
            input: input,
            category: res.category,
            response: res.response
        }
    }
}
