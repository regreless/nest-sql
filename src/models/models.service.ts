import { Injectable } from '@nestjs/common';
import { config } from '../config/index';
import type { Response } from 'express';
import { ChatOllama } from '@langchain/ollama';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { StringOutputParser } from '@langchain/core/output_parsers';
@Injectable()
export class ModelsService {
  private llm = new ChatOllama({
    model: config.ollama.chatModel,
    temperature: config.ollama.temperature,
    baseUrl: config.ollama.host,
    think: false,
    keepAlive: '30m',
    numPredict: 512,
  });
  async baseChat(message: string) {
    const response = await this.llm.invoke([new HumanMessage(message)]);
    return {
      question: message,
      answer: response.content,
      usage: response.usage_metadata, // 包含 token 使用情况
    };
  }

  // SystemMessage 设定模型的角色和行为， HumanMessage 是用户输入的消息
  async chatSystem({ system, message }: { system: string; message: string }) {
    const response = await this.llm.invoke([
      new SystemMessage(system), // 可选的系统消息 ，角色设定
      new HumanMessage(message), // 用户输入的问题
    ]);
    return {
      system,
      question: message,
      answer: response.content,
      usage: response.usage_metadata, // 包含 token 使用情况
    };
  }

  async chatStream({ message }: { message: string }, res: Response) {
    // 设置响应头，告诉客户端这是一个流式响应
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*'); // 允许跨域访问，实际项目中请根据需要设置具体的域名
    const stream = await this.llm.stream([new HumanMessage(message)]);
    // sse 格式固定： data: 服务器发送的数据\n\n
    for await (const chunk of stream) {
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    }
    // 当流结束时，发送一个特殊的事件通知客户端
    res.write(`data: [DONE]\n\n`);
    res.end();
  }

  // pipeline 组合多个模型一起使用的示例，先用一个模型生成提示词，再用另一个模型根据提示词生成回答
  async asyncchatWithParser(message: string) {
    // prompt 模板，包含一个占位符 {question}，用于接收用户输入的问题
    // llm
    // parser 解析器，用于从模型的输出中提取结构化数据，这里我们用一个简单的正则表达式解析器，提取出回答中的关键词
    const chain = this.llm.pipe(new StringOutputParser());
    const answer = await chain.invoke([new HumanMessage(message)]);
    // answer 直接是一个字符串 ，不需要再从 response.content 中提取了    AIMessage
    return {
      question: message,
      answer,
    };
  }
}
