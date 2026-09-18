import { Module } from '@nestjs/common'
import { LanggraphService } from './langgraph.service'
import { LanggraphController } from './langgraph.controller'
import { ArticleModule } from '../article/article.module'
import { ReactAgentService } from './react-agent.service'
import { RoutingService } from './routing.service'
import { ParallelService } from './parallel.service'
import { CodeReviewService } from './code-review.service'
import { SupervisorService } from './supervisor.service'
import { PipelineService } from './pipeline.service'
import { EmailApprovalService } from './email-approval.service';

@Module({
    imports: [ArticleModule],
    controllers: [LanggraphController],
    providers: [
        LanggraphService,
        ReactAgentService,
        RoutingService,
        ParallelService,
        PipelineService,
        SupervisorService,
        CodeReviewService,
        EmailApprovalService
    ]
})
export class LanggraphModule {}
