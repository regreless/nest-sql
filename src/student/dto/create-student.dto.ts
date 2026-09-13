import { IsString, Matches, MaxLength } from 'class-validator';

export class CreateStudentDto {
  @IsString()
  @Matches(/^\S+$/, { message: 'studentNo 不能为空或包含空白字符' })
  @MaxLength(32)
  studentNo: string;

  @IsString()
  @Matches(/\S/, { message: 'name 不能是空白字符串' })
  @MaxLength(100)
  name: string;
}
