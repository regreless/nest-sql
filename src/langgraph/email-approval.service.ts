import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common'
import { ChatOllama } from '@langchain/ollama'
import { StateGraph, Annotation, MemorySaver, START, END, interrupt, Command } from '@langchain/langgraph'
import { config } from '../config'
import { HumanMessage } from '@langchain/core/messages'

const EmailState = Annotation.Root({
    emailRequest: Annotation<string>(),
    draftEmail: Annotation<{ subject: string; recipient: string; body: string }>(),
    approvalStatus: Annotation<'approved' | 'rejected' | 'pending' | 'need_modify'>(),
    modifyFeedback: Annotation<string>(),
    revisionCount: Annotation<number>({
        default: () => 0,
        reducer: prev => prev + 1
    }),
    finalStatus: Annotation<string>()
})

@Injectable()
export class EmailApprovalService implements OnModuleInit {
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

        // 节点1 ： 草拟邮件
        const draftNode = async (state: typeof EmailState.State) => {
            const isRevision = !!state.modifyFeedback
            console.log(
                `\n✍️ [draftNode] ${isRevision ? '根据反馈修改邮件草稿' : '初次起草'}，当前已修改 ${state.revisionCount} 次`
            )
            const prompt = isRevision
                ? `根据以下反馈修改邮件草稿：
            修改建议：${state.modifyFeedback}
            原始需求：${state.emailRequest}
            上次草稿：${JSON.stringify(state.draftEmail)}`
                : `请根据以下请求草拟一封邮件：
            ${state.emailRequest}`

            const res = await llm.invoke([
                new HumanMessage(
                    `\n${prompt}\n\n请输出 JSON（不要其他内容）: {"subject":"邮件主题","recipient":"收件人","body":"正文内容"}`
                )
            ])
            let draft: { subject: string; recipient: string; body: string }
            // 解析 LLM 输出（这里假设输出是 JSON 格式）
            try {
                const json = (res.content as string).replace(/```json\n?|\n?```/g, '').trim()
                draft = JSON.parse(json)
            } catch {
                draft = { subject: '草稿', recipient: '未知', body: res.content as string }
            }
            console.log(`   收件人: ${draft.recipient}，主题: ${draft.subject}`)

            return {
                draftEmail: draft,
                approvalStatus: 'pending' as const,
                revisionCount: 0,
                finalStatus: isRevision ? 1 : 0
            }
        }
        // 节点2 ： 等待人工审批 （interrupt 暂停）

        const waitNode = async (state: typeof EmailState.State) => {
            console.log(
                `\n⏳ [waitNode] 等待人工审批... 当前状态: ${state.approvalStatus}，第 ${state.revisionCount + 1} 次修改`
            )
            const decision = interrupt({
                type: 'email_review',
                message: `请审批邮件草稿，当前状态: ${state.approvalStatus}，第 ${state.revisionCount + 1} 次修改。`,
                draft: state.draftEmail,
                options: {
                    approve: '批准',
                    reject: '驳回',
                    modify: '需要修改'
                }
            })
            console.log(`   人工审批结果: ${JSON.stringify(decision)}`)

            if (typeof decision === 'string') {
                return { approvalStatus: decision as any }
            }
            if (typeof decision === 'object' && (decision as any).action === 'modify') {
                return { approvalStatus: 'need_modify' as const, modifyFeedback: decision.feedback }
            }
            return { approvalStatus: 'rejected  ' as const }
        }

        // 路由函数：根据审批结果路由到不同节点
        const routeAfterApproval = (state: typeof EmailState.State) => {
            console.log(`\n🔀 [routeAfterApproval] 路由决策，审批状态: ${state.approvalStatus}`)
            switch (state.approvalStatus) {
                case 'approved':
                    return 'sendNode'
                case 'need_modify':
                    return 'draftNode'
                default:
                    return 'cancelNode'
            }
        }
        // 节点3：发送邮件（这里我们只是模拟发送）
        const sendNode = async (state: typeof EmailState.State) => {
            console.log(`\n📤 [sendNode] 发送邮件给 ${state.draftEmail.recipient}，主题: ${state.draftEmail.subject}`)
            // 模拟发送邮件的过程   实际的项目里面 这里可以调用邮件发送服务的 API 企业邮件api
            return {
                finalStatus: `邮件已发送： 收件人: ${state.draftEmail.recipient}, 主题: ${state.draftEmail.subject}`
            }
        }

        // 节点4：取消流程
        const cancelNode = async (state: typeof EmailState.State) => {
            console.log(`\n❌ [cancelNode] 流程已取消，邮件未发送。 状态：${state.approvalStatus}`)
            return { finalStatus: `邮件已取消： 审批状态：${state.approvalStatus}` }
        }

        this.graph = new StateGraph(EmailState)
            .addNode('draftNode', draftNode)
            .addNode('waitNode', waitNode)
            .addNode('sendNode', sendNode)
            .addNode('cancelNode', cancelNode)
            .addEdge(START, 'draftNode')
            .addEdge('draftNode', 'waitNode')
            .addConditionalEdges('waitNode', routeAfterApproval, {
                sendNode: 'sendNode',
                draftNode: 'draftNode',
                cancelNode: 'cancelNode'
            })
            .addEdge('sendNode', END)
            .addEdge('cancelNode', END)
            .compile({ checkpointer: new MemorySaver() })

        console.log('✅ 邮件审批流程图已初始化')
    }

    async start(request: string, thread_id: string) {
        if (typeof thread_id !== 'string' || !thread_id.trim()) {
            throw new BadRequestException('thread_id 必须是非空字符串')
        }
        console.log(`\n🚀 [EmailService] 启动邮件审批流程，线程ID: ${thread_id}`)

        const result = await this.graph.invoke({ emailRequest: request }, { configurable: { thread_id } })

        if (result.__interrupted__) {
            return {
                status: 'waiting_for_approval',
                threadId: thread_id,
                reviewData: result.__interrupted__[0].value, // 包含审批相关数据（如草稿内容、审批选项等）
                message: '邮件草稿已生成，正在等待人工审批。请前往审批界面进行操作。'
            }
        }
        return { status: 'completed', result: result }
    }
    async approve(threadId: string) {
        console.log(`\n✅ [EmailService] 收到审批通过指令，线程ID: ${threadId}`)
        // 这里我们直接调用 graph 的 resume 方法来继续流程
        const result = await this.graph.invoke(new Command({ resume: 'approved' }), {
            configurable: { thread_id: threadId }
        })
        const state = await this.graph.getState({ configurable: { thread_id: threadId } })
        console.log(`   当前状态: ${JSON.stringify(state.values)}`)
        return { status: 'email_send', finalStatus: state.values.finalStatus }
    }
    async reject(threadId: string) {
        console.log(`\n✅ [EmailService] 收到审批驳回指令，线程ID: ${threadId}`)
        // 这里我们直接调用 graph 的 resume 方法来继续流程
        const result = await this.graph.invoke(new Command({ resume: 'rejected' }), {
            configurable: { thread_id: threadId }
        })
        return { status: 'canceled', message: '邮件审批已驳回，流程已取消。' }
    }

    async modify(threadId: string, feedback: string) {
        console.log(`\n✅ [EmailService] 收到审批修改指令，线程ID: ${threadId}, 修改反馈: ${feedback}`)
        // 这里我们直接调用 graph 的 resume 方法来继续流程
        const result = await this.graph.invoke(new Command({ resume: { action: 'modify', feedback } }), {
            configurable: { thread_id: threadId }
        })
        if (result.__interrupted__) {
            return {
                status: 'waiting_for_approval',
                threadId,
                reviewData: result.__interrupted__[0].value, // 包含审批相关数据（如草稿内容、审批选项等）
                message: '修改意见已提交，正在等待人工审批。请前往审批界面进行操作。'
            }
        }
        return { status: 'completed', message: '修改已提交并通过审批，流程继续进行。' }
    }

    async getStatus(threadId: string) {
        console.log(`\n🔍 [EmailService] 查询流程状态，线程ID: ${threadId}`)
        const state = await this.graph.getState({ configurable: { thread_id: threadId } })
        console.log(`   当前状态: ${JSON.stringify(state.values)}`)
        return {
            threadId,
            currentState: state.values,
            message: `当前审批状态：${state.values.approvalStatus}，已修改次数：${state.values.revisionCount}`
        }
    }
}
