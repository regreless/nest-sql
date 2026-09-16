import { Controller, Post, Body } from '@nestjs/common'
import { EmbedService } from './embed.service'
import { EmbedSingleDto, EmbedBatchDto, EmbedQueryDto } from './dto/embed.dto'

@Controller('embed')
export class EmbedController {
    constructor(private readonly embedService: EmbedService) {}
    // Post 请求
    @Post('single')
    async createSingle(@Body() dto: EmbedSingleDto) {
        return this.embedService.createSingle(dto.text)
    }

    @Post('batch')
    async createBatch(@Body() dto: EmbedBatchDto) {
        return this.embedService.createBatch(dto.texts)
    }

    @Post('query')
    async similarity(@Body() dto: EmbedQueryDto) {
        return this.embedService.createQuery(dto.query, dto.documents)
    }
}
