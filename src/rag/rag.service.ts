import 'dotenv/config'
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common'
import { AddDocumentsDto, QueryDto, SearchDto } from './dto/rag.dto'
import { OllamaEmbeddings, ChatOllama } from '@langchain/ollama'
import { PGVectorStore } from '@langchain/pgvector'
import type { PGVectorStoreArgs } from '@langchain/pgvector'
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'
import { Document } from '@langchain/core/documents'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { StringOutputParser } from '@langchain/core/output_parsers'
import { Pool } from 'pg'
@Injectable()
export class RagService implements OnModuleInit, OnModuleDestroy {
    private readonly logger: Logger = new Logger(RagService.name)
    private ollamaEmbeddings: OllamaEmbeddings
    private chatOllama: ChatOllama
    private pool: Pool

    private get_pg_config(collection_name: string): PGVectorStoreArgs {
        return {
            pool: this.pool,
            tableName: 'langchain_pg_embedding',
            collectionName: collection_name,
            collectionTableName: 'langchain_pg_collection',
            columns: {
                idColumnName: 'id',
                vectorColumnName: 'embedding',
                contentColumnName: 'content',
                metadataColumnName: 'metadata'
            },
            distanceStrategy: 'cosine',
            scoreNormalization: 'distance'
        }
    }

    private async create_vector_store(collection_name: string): Promise<PGVectorStore> {
        // 直接使用共享连接池，避免 initialize 为每次请求长期占用一个连接。
        const vector_store = new PGVectorStore(this.ollamaEmbeddings, this.get_pg_config(collection_name))
        await vector_store.ensureTableInDatabase()
        await vector_store.ensureCollectionTableInDatabase()
        return vector_store
    }

    async onModuleDestroy() {
        await this.pool?.end()
    }

    onModuleInit() {
        const connection_string = process.env.DATABASE_URL
        if (!connection_string) {
            throw new Error('DATABASE_URL is required. Configure it in .env.')
        }
        // 初始化逻辑
        this.ollamaEmbeddings = new OllamaEmbeddings({
            model: 'mxbai-embed-large:latest',
            baseUrl: 'http://localhost:11434'
        })
        this.chatOllama = new ChatOllama({
            model: 'qwen3.5:0.8b',
            think: false, // 是否开启思考模式，开启后模型会先返回一个思考中的消息，等生成完成后再返回最终回答
            numPredict: 512, // 生成文本的最大 token 数量，512 是一个比较合理的值，可以根据需要调整
            baseUrl: 'http://localhost:11434'
        })
        // postgreSQL 连接池配置
        this.pool = new Pool({
            connectionString: connection_string,
            max: 10,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 3000
        })
        this.logger.log('RagService initialized')
    }

    async addDocuments(dto: AddDocumentsDto) {
        const chunkSize = dto.chunkSize ?? 500
        const chunkOverlap = dto.chunkOverlap ?? 50
        const splitter = new RecursiveCharacterTextSplitter({
            chunkSize,
            chunkOverlap,
            separators: ['\n\n', '\n', ' 。', '!']
        })
        // 1. 文本切分 - 这里可以使用任何文本切分工具或库来实现
        // 2. 向量化 - 调用 Ollama API 生成文本块的向量
        // 3. 存储 - 将文本块和对应的向量存储到 PostgreSQL 中
        const allDocs: Document[] = []
        for (const doc of dto.documents) {
            const chunks = await splitter.createDocuments([doc.content], [{ id: doc.id, metadata: doc.metadata }])
            chunks.forEach((chunk, index) => {
                chunk.metadata.chunkIndex = index
                chunk.metadata.totalChunks = chunks.length
                allDocs.push(chunk)
            })
            this.logger.log(`Total documents 文档 ${doc.id} 分块完成： 共: ${chunks.length} 块`)
        }
        const vector_store = await this.create_vector_store(dto.collectionName)
        await vector_store.addDocuments(allDocs)

        return {
            success: true,
            backend: 'pgvector',
            collectionName: dto.collectionName,
            documentCount: dto.documents.length,
            chunkCount: allDocs.length,
            chunkSize,
            chunkOverlap
        }
    }

    async search(dto: SearchDto) {
        const topK = dto.topK ?? 3
        const vectorStore = await this.create_vector_store(dto.collectionName)
        const results = await vectorStore.similaritySearchWithScore(dto.query, topK)
        return {
            query: dto.query,
            backend: 'pgvector',
            collectionName: dto.collectionName,
            results: results.map(([doc, score]) => ({
                content: doc.pageContent,
                metadata: doc.metadata,
                score: parseFloat(score.toFixed(6))
            }))
        }
    }

    async query(dto: QueryDto) {
        const topK = dto.topK ?? 3
        const vectorStore = await this.create_vector_store(dto.collectionName)
        const queryWithPrefix = `Represent this sentence for searching relevant passages: ${dto.question}`
        const retrieved = await vectorStore.similaritySearchWithScore(queryWithPrefix, topK)
        if (retrieved.length === 0) {
            return {
                question: dto.question,
                answer: '知识库中没有内容',
                sources: []
            }
        }

        const context = retrieved.map(([doc], i) => `[${i + 1}] ${doc.pageContent}`).join('\n\n')

        const prompt = ChatPromptTemplate.fromMessages([
            [
                'system',
                `你是专业的知识库问答助手。严格根据参考资料回答问题，无相关内容时直接回答"知识库中暂无相关内容"，不要编造。
                参考资料：
            {context}`
            ],
            ['human', '{question}']
        ])
        const chain = prompt.pipe(this.chatOllama).pipe(new StringOutputParser())
        const answer = await chain.invoke({ context, question: dto.question })

        return {
            question: dto.question,
            backend: 'pgvector',
            answer,
            sources: retrieved.map(([doc, score]) => ({
                content: doc.pageContent,
                score: parseFloat(score.toFixed(6)),
                metadata: doc.metadata
            }))
        }
    }
}
