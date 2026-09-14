import { IsString, Matches } from 'class-validator';

export class ChatDto {
  @IsString({ message: 'message 必须是字符串' })
  @Matches(/\S/, { message: 'message 不能为空' })
  message: string;
}
