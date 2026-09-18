import { Injectable, OnModuleInit } from '@nestjs/common'
import { ChatOllama } from '@langchain/ollama'
import { StateGraph, Annotation, MessagesAnnotation, MemorySaver, START, END } from '@langchain/langgraph'
import { config } from '../config'
import { HumanMessage } from '@langchain/core/messages'

const PipelineState = Annotation.Root({
    topic: Annotation<string>(),
    research: Annotation<string>(),
    outline: Annotation<string>(),
    draft: Annotation<string>(),
    finalArticle: Annotation<string>(),
    process: Annotation<string[]>({
        reducer: (prev, curr) => [...prev, ...curr],
        default: () => []
    })
})

@Injectable()
export class PipelineService implements OnModuleInit {
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

        const researchAgent = async (state: typeof PipelineState.State) => {
            // console.log('Researching with topic:', state.topic);
            const res = await llm.invoke([
                new HumanMessage(`你是一个研究员，为 ${state.topic} 收集素材：
                    1. 背景介绍（2-3 句）
                    2. 核心要点（3-5 个）
                    3. 典型案例（1-2 个）
                    每条不超过 50 字。`)
            ])

            return { research: res.content, process: ['素材收集完成'] }
        }

        const outlineAgent = async (state: typeof PipelineState.State) => {
            // console.log('Outlining with research:', state.research);
            const res = await llm.invoke([
                new HumanMessage(`你是一个大纲师，根据以下素材为 ${state.topic} 制定写作大纲：
                    ${state.research}
                    输出 3-5 个核心要点作为大纲，每条不超过 20 字。`)
            ])

            return { outline: res.content, process: ['大纲制定完成'] }
        }

        const writerAgent = async (state: typeof PipelineState.State) => {
            // console.log('Writing draft with outline:', state.outline);
            const res = await llm.invoke([
                new HumanMessage(`你是一个写手，根据下面的要求写文章 （300-500 字 ）：    
                主题：${state.topic}
                大纲：${state.outline}
                参考素材：${state.research}`)
            ])

            return { draft: res.content, process: ['初稿撰写完成'] }
        }

        const reviewAgent = async (state: typeof PipelineState.State) => {
            // console.log('Reviewing and finalizing with draft:', state.draft);
            const res = await llm.invoke([
                new HumanMessage(`你是编辑，优化以下文章，直接输出优化后全文：\n${state.draft}`)
            ])
            return { finalArticle: res.content, process: ['最终定稿完成'] }
        }

        this.graph = new StateGraph(PipelineState)
            .addNode('researchAgent', researchAgent)
            .addNode('outlineAgent', outlineAgent)
            .addNode('writerAgent', writerAgent)
            .addNode('reviewAgent', reviewAgent)
            .addEdge(START, 'researchAgent')
            .addEdge('researchAgent', 'outlineAgent')
            .addEdge('outlineAgent', 'writerAgent')
            .addEdge('writerAgent', 'reviewAgent')
            .addEdge('reviewAgent', END)
            .compile()

        console.log('内容生成流程图已初始化')
    }

    async process(topic: string) {
        const t0 = Date.now()
        const result = await this.graph.invoke({ topic })
        return {
            topic,
            progress: result.process,
            article: result.finalArticle,
            totalTime: `${(Date.now() - t0) / 1000} seconds`
        }
    }
}
