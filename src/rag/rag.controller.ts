import { Body, Controller, Post } from '@nestjs/common'
import { RagService } from './rag.service'
import { AddDocumentsDto, SearchDto, QueryDto } from './dto/rag.dto'
@Controller('rag')
export class RagController {
    constructor(private readonly ragService: RagService) {}

    @Post('doc')
    addDocuments(@Body() dto: AddDocumentsDto) {
        return this.ragService.addDocuments(dto)
    }

    @Post('search')
    search(@Body() dto: SearchDto) {
        // 这里可以从请求体中获取 collectionName 和 query
        return this.ragService.search(dto)
    }

    @Post('query')
    query(@Body() dto: QueryDto) {
        return this.ragService.query(dto)
    }
}
