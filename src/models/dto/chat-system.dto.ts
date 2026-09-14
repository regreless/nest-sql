import { IsString, Matches } from 'class-validator';
import { ChatDto } from './chat.dto';

export class ChatSystemDto extends ChatDto {
  @IsString({ message: 'system 必须是字符串' })
  @Matches(/\S/, { message: 'system 不能为空' })
  system: string;
}
