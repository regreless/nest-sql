import { Injectable } from '@nestjs/common'
import { OllamaEmbeddings } from '@langchain/ollama'
@Injectable()
export class EmbedService {
    private ollamaEmbeddings: OllamaEmbeddings
    constructor() {
        this.ollamaEmbeddings = new OllamaEmbeddings({
            model: 'mxbai-embed-large:latest',
            baseUrl: 'http://localhost:11434'
        })
    }
    async createSingle(text: string) {
        // 调用 Ollama API 生成单条文本的向量
        // 这里需要根据 Ollama API 的具体实现来编写代码
        // 例如，使用 HTTP 请求库发送请求并处理响应
        const vector = await this.ollamaEmbeddings.embedQuery(text)
        return {
            text,
            vector,
            dimension: vector.length
        }
    }

    async createBatch(texts: string[]) {
        // 调用 Ollama API 生成批量文本的向量
        // 这里需要根据 Ollama API 的具体实现来编写代码
        const vectors = await this.ollamaEmbeddings.embedDocuments(texts)
        return vectors.map((text, index) => ({
            index,
            text,
            vector: vectors[index],
            dimension: vectors[index].length
        }))
    }
    // 计算查询与文档之间的相似度 并返回相似度最高的文档
    async createQuery(query: string, documents: string[]) {
        // 调用 Ollama API 计算查询与文档之间的相似度
        // 这里需要根据 Ollama API 的具体实现来编写代码

        // 查询向量， 加上检索前缀
        const queryVector = await this.ollamaEmbeddings.embedQuery(
            `Represent this sentence for searching relevant passages: ${query}`
        )
        // 文档向量 - 这里假设文档已经被预先处理并存储了向量，或者你可以在这里直接计算文档的向量
        const documentVectors = await this.ollamaEmbeddings.embedDocuments(documents)

        // 计算查询向量与每个文档向量之间的相似度 - 这里可以使用余弦相似度、欧氏距离等方法来计算

        const similarities = documentVectors.map((docVector, i) => {
            // 计算查询向量与文档向量之间的相似度
            // 这里可以使用余弦相似度、欧氏距离等方法来计算
            const similarity = this.cosineSimilarity(queryVector, docVector)
            return {
                index: i,
                similarity: parseFloat(similarity.toFixed(6)),
                text: documents[i]
            }
        })
        // 找到相似度最高的文档
        similarities.sort((a, b) => b.similarity - a.similarity)
        return {
            query,
            similarities
        }
    }

    private cosineSimilarity(vecA: number[], vecB: number[]): number {
        const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0)
        const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0))
        const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0))
        if (magnitudeA === 0 || magnitudeB === 0) {
            return 0 // 避免除以零的情况
        }
        return dotProduct / (magnitudeA * magnitudeB)
    }
}
