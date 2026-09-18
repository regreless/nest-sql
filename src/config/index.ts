export const config = {
    ollama: {
        // 这里的 host 是 Ollama 服务器的地址，默认是 http://localhost:11434
        host: 'http://localhost:11434',

        // chatModel 是 Ollama 上已经安装好的模型名称
        chatModel: 'qwen3.5:0.8b',

        // embedModel 是用于向量化的模型名称
        embedModel: 'mxbai-embed-large:latest',

        // 生成文本的随机程度，值越大越随机，值越小越稳定
        temperature: 0.3
    },

    langGraph: {
        model: process.env.LANGGRAPH_MODEL || 'qwen3.5:0.8b',
        baseURL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1',
        apiKey: 'ollama', // Ollama 不校验 apiKey，随便填个占位符即可
        temperature: 0.7
    }
}
