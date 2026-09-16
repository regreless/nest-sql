import { ArrayNotEmpty, IsArray, IsString, Matches } from 'class-validator'

export class EmbedSingleDto {
    @IsString()
    @Matches(/\S/, { message: 'text 不能为空' })
    text: string
}

export class EmbedBatchDto {
    @IsArray()
    @ArrayNotEmpty()
    @IsString({ each: true })
    @Matches(/\S/, { each: true, message: 'texts 中的文本不能为空' })
    texts: string[]
}

export class EmbedQueryDto {
    @IsString()
    @Matches(/\S/, { message: 'query 不能为空' })
    query: string

    @IsArray()
    @ArrayNotEmpty()
    @IsString({ each: true })
    @Matches(/\S/, { each: true, message: 'documents 中的文本不能为空' })
    documents: string[]
}
