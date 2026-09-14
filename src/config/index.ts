export const config = {
  ollama: {
    // 这里的 host 是 Ollama 服务器的地址，默认是 http://localhost:11434
    host: 'http://localhost:11434',

    // chatModel 是 Ollama 上已经安装好的模型名称
    chatModel: 'qwen3.5:0.8b',

    // embedModel 是用于向量化的模型名称
    embedModel: 'tmxbai-embed-large:latest',

    // 生成文本的随机程度，值越大越随机，值越小越稳定
    temperature: 0.3,
  },
};
