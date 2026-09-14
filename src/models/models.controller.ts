import { Body, Controller, Post, Res } from '@nestjs/common';
import { ModelsService } from './models.service';
import { ChatDto } from './dto/chat.dto';
import type { Response } from 'express';
import { ChatSystemDto } from './dto/chat-system.dto';

@Controller('models')
export class ModelsController {
  constructor(private readonly models_service: ModelsService) {}

  @Post('chat')
  baseChat(@Body() chat_dto: ChatDto) {
    return this.models_service.baseChat(chat_dto.message);
  }

  @Post('chat-system')
  chatSystem(@Body() chat_dto: ChatSystemDto) {
    return this.models_service.chatSystem(chat_dto);
  }

  @Post('chat-stream')
  chatStream(@Body() { message }: { message: string }, @Res() res: Response) {
    return this.models_service.chatStream({ message }, res);
  }

  @Post('chat-parser')
  chatWithParser(@Body() { message }: { message: string }) {
    return this.models_service.asyncchatWithParser(message);
  }
}
