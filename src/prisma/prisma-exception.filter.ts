import {
  ArgumentsHost,
  Catch,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Prisma } from '../generated/prisma/client';

// 统一把数据库约束错误转换为 HTTP 错误，不向调用方暴露数据库细节。
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter extends BaseExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    switch (exception.code) {
      case 'P2002':
        return super.catch(
          new ConflictException('学号、课程编号或选课记录已存在'),
          host,
        );
      case 'P2003':
        return super.catch(new NotFoundException('学生或课程不存在'), host);
      case 'P2025':
        return super.catch(new NotFoundException('记录不存在'), host);
      default:
        return super.catch(exception, host);
    }
  }
}
