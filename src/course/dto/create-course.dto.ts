import { IsString, Matches, MaxLength } from 'class-validator';

export class CreateCourseDto {
  @IsString()
  @Matches(/^\S+$/, { message: 'code 不能为空或包含空白字符' })
  @MaxLength(32)
  code: string;

  @IsString()
  @Matches(/\S/, { message: 'name 不能是空白字符串' })
  @MaxLength(100)
  name: string;
}
