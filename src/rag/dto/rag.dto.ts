import { Type } from 'class-transformer'
import { ArrayNotEmpty, IsArray, IsInt, IsObject, IsOptional, IsString, Matches, Min, ValidateNested } from 'class-validator'

export class RagDocumentDto {
    @IsString()
    @Matches(/\S/)
    id: string

    @IsString()
    @Matches(/\S/)
    content: string

    @IsOptional()
    @IsObject()
    metadata?: Record<string, unknown>
}

export class AddDocumentsDto {
    @IsString()
    @Matches(/\S/)
    collectionName: string

    @IsArray()
    @ArrayNotEmpty()
    @ValidateNested({ each: true })
    @Type(() => RagDocumentDto)
    documents: RagDocumentDto[]

    @IsOptional()
    @IsInt()
    @Min(1)
    chunkSize?: number // 默认 500

    @IsOptional()
    @IsInt()
    @Min(0)
    chunkOverlap?: number // 默认 50
}

export class SearchDto {
    @IsString()
    @Matches(/\S/)
    collectionName: string

    @IsString()
    @Matches(/\S/)
    query: string

    @IsOptional()
    @IsInt()
    @Min(1)
    topK?: number
}

export class QueryDto {
    @IsString()
    @Matches(/\S/)
    collectionName: string

    @IsString()
    @Matches(/\S/)
    question: string

    @IsOptional()
    @IsInt()
    @Min(1)
    topK?: number
}
