import { Controller, Post, Body } from '@nestjs/common'
import { ArticleService } from './article.service'

@Controller('langgraph')
export class ArticleController {
    constructor(private readonly article_svc: ArticleService) {}

    // 工作流三：文章摘要流水线
    @Post('article')
    process_article(@Body() body: { article: string }) {
        return this.article_svc.process(body.article)
    }
}
