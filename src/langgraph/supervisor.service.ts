import { Injectable, OnModuleInit } from '@nestjs/common'
import { ChatOllama } from '@langchain/ollama'
import { StateGraph, Annotation, MessagesAnnotation, START, END } from '@langchain/langgraph'
import { config } from '../config'
import { SystemMessage, HumanMessage, AIMessage } from '@langchain/core/messages'

const SupervisorState = Annotation.Root({
    messages: MessagesAnnotation.spec.messages,
    nextAgent: Annotation<string>(),
    completedAgents: Annotation<string[]>({
        reducer: (prev, curr) => [...prev, ...curr],
        default: () => []
    })
})

@Injectable()
export class SupervisorService implements OnModuleInit {
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

        // Supervisor 节点：LLM 决定下一步调哪个 Agent
        const supervisor = async (state: typeof SupervisorState.State) => {
            const done = state.completedAgents.length
                ? `已完成：${state.completedAgents.join('、')}`
                : '尚未调用任何 Agent'

            const res = await llm.invoke([
                new SystemMessage(`你是任务协调者，管理以下专业 Agent：
                - researcher：收集信息、搜索资料
                - analyst：数据分析、逻辑推理
                - writer：撰写报告、优化表达

                规则：
                1. 根据任务需求按需选择 Agent
                2. ${done}
                3. 所有必要工作完成后输出 FINISH
                4. 只输出下一个 Agent 名称或 FINISH，不要其他内容

                可选值：researcher | analyst | writer | FINISH`),
                ...state.messages
            ])

            const nextAgent = (res.content as string).trim()
            const validAgents = ['researcher', 'analyst', 'writer', 'FINISH']
            const safeNext = validAgents.includes(nextAgent) ? nextAgent : 'FINISH'
            // if (!validAgents.includes(nextAgent)) {
            //     throw new Error(`Invalid agent name: ${nextAgent}`)
            // }
            return { nextAgent: safeNext, messages: [new AIMessage(`[Supervisor] 下一步决定调用 ${safeNext}`)] }
        }
        // 路由函数： FINISH --END 则结束，否则路由（Worker）到对应 Agent
        const routeToAgent = (state: typeof SupervisorState.State) => {
            if (state.nextAgent === 'FINISH') {
                return END
            }
            return state.nextAgent
        }
        // Worker 工厂函数 避免三个Worker 节点重复代码
        const createWorker = (name: string, systemPrompt: string) => async (state: typeof SupervisorState.State) => {
            // 取第一条用户信息息作为 Agent 输入，实际应用中可以根据需要调整输入内容
            const userMsg = state.messages.find(m => m instanceof HumanMessage) as HumanMessage
            // 取最近4条消息作为上下文，实际应用中可以根据需要调整上下文范围
            const context = state.messages
                .slice(-4)
                .map(m => m.content)
                .join('\n')

            const res = await llm.invoke([
                new SystemMessage(`${systemPrompt}`),
                new HumanMessage(`原始任务：${userMsg?.content ?? ''}\n\n当前上下文：\n${context}`)
            ])

            return {
                messages: [new AIMessage(`[${name}] ${res.content}`)],
                completedAgents: [name] // 把完成的 Agent 记录到状态里，供 Supervisor 参考
            }
        }

        this.graph = new StateGraph(SupervisorState)
            .addNode('supervisor', supervisor)
            .addNode('researcher', createWorker('researcher', '你是研究员，擅长收集整理信息，提供详细调研结果。'))
            .addNode('analyst', createWorker('analyst', '你是分析师，擅长数据分析和逻辑推理。'))
            .addNode('writer', createWorker('writer', '你是作家，擅长撰写报告和优化表达。'))
            .addEdge(START, 'supervisor')
            .addConditionalEdges('supervisor', routeToAgent, {
                researcher: 'researcher',
                analyst: 'analyst',
                writer: 'writer',
                [END]: END
            })
            // 所有的 Worker 节点执行完后都回到 Supervisor 节点，形成循环，直到 Supervisor 输出 FINISH 结束循环
            .addEdge('researcher', 'supervisor')
            .addEdge('analyst', 'supervisor')
            .addEdge('writer', 'supervisor')
            .compile()
    }

    async run(userInput: string) {
        const result = await this.graph.invoke(
            { messages: [new HumanMessage(userInput)] },
            {
                recursionLimit: 10 // 设置递归限制，防止 Worker 过多导致死循环
            }
        )
        const messages = result.messages as AIMessage[]
        const agentLog = messages
            .filter(m => typeof m.content === 'string' && m.content.includes('['))
            .map(m => m.content)
            .join('\n')
        const writerOutput = messages
            .filter(m => typeof m.content === 'string' && (m.content as string).startsWith('[writer]'))
            .map(m => m.content)
            .join('\n')
        const finalResponse =
            writerOutput ||
            messages.find(m => typeof m.content === 'string' && (m.content as string).startsWith('['))?.content ||
            '没有生成结果'
        return {
            finalResponse: finalResponse,
            agentLog: agentLog,
            completedAgents: result.completedAgents
        }
    }
}
