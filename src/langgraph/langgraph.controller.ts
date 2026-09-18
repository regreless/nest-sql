import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common'
import { LanggraphService } from './langgraph.service'
import { ArticleService } from '../article/article.service'
import { ReactAgentService } from './react-agent.service'
import { RoutingService } from './routing.service'
import { ParallelService } from './parallel.service'
import { SupervisorService } from './supervisor.service'
import { PipelineService } from './pipeline.service'
import { CodeReviewService } from './code-review.service'
import { EmailApprovalService } from './email-approval.service'

@Controller('langgraph')
export class LanggraphController {
    constructor(
        private readonly svc: LanggraphService,
        private readonly article_svc: ArticleService,
        private readonly reactSvc: ReactAgentService,
        private readonly routingSvc: RoutingService,
        private readonly parallelSvc: ParallelService,
        private readonly supervisorSvc: SupervisorService,
        private readonly pipelineSvc: PipelineService,
        private readonly codeReviewSvc: CodeReviewService,
        private readonly emailSvc: EmailApprovalService
    ) {}

    // 工作流一：无记忆简单问答
    @Post('simple-chat')
    simpleChat(@Body() body: { message: string }) {
        return this.svc.simpleChat(body.message).then(answer => ({ answer }))
    }

    // 工作流2：有记忆简单问答 --多轮对话
    @Post('memory-chat')
    memoryChat(@Body() body: { threadId: string; message: string }) {
        return this.svc.memoryChat(body.threadId, body.message).then(answer => ({ answer }))
    }

    @Get('history/:threadId')
    getHistory(@Param('threadId') threadId: string) {
        return this.svc.getHistory(threadId)
    }

    // 工作流三：文章摘要流水线
    @Post('article')
    process_article(@Body() body: { article: string }) {
        return this.article_svc.process(body.article)
    }

    // 工作流四：React Agent  ReAct Agent 是一种能够在对话过程中调用工具（如搜索、计算等）的智能体，适用于需要动态交互和工具使用的复杂场景
    @Post('react-chat')
    reactChat(@Body() body: { threadId: string; message: string }) {
        return this.reactSvc.chat(body.threadId, body.message).then(answer => ({ answer }))
    }

    @Post('route')
    routeChat(@Body() body: { input: string }) {
        return this.routingSvc.routeChat(body.input)
    }

    @Post('parallel')
    parallelChat(@Body() body: { task: string }) {
        return this.parallelSvc.parallelChat(body.task)
    }

    @Post('supervisor')
    supervisorChat(@Body() body: { input: string }) {
        return this.supervisorSvc.run(body.input)
    }

    @Post('pipeline')
    processPipeline(@Body() body: { topic: string }) {
        return this.pipelineSvc.process(body.topic)
    }

    @Post('code-review')
    codeReview(@Body() body: { code: string; language?: string }) {
        return this.codeReviewSvc.review(body.code, body.language)
    }

    @Post('email/start')
    process_email(@Body() body: { request: string; thread_id?: string; threadId?: string }) {
        return this.emailSvc.start(body.request, body.thread_id ?? body.threadId ?? '')
    }

    @Post('email/:threadId/approve')
    emailApprove(@Param('threadId') threadId: string) {
        return this.emailSvc.approve(threadId)
    }

    @Post('email/:threadId/reject')
    emailReject(@Param('threadId') threadId: string) {
        return this.emailSvc.reject(threadId)
    }

    @Post('email/:threadId/modify')
    emailModify(@Param('threadId') threadId: string, @Body() body: { feedback: string }) {
        return this.emailSvc.modify(threadId, body.feedback)
    }

    @Get('email/:threadId/status')
    emailStatus(@Param('threadId') threadId: string) {
        return this.emailSvc.getStatus(threadId)
    }
}
