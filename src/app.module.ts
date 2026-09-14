import { Module, ValidationPipe } from '@nestjs/common';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CourseModule } from './course/course.module';
import { StudentModule } from './student/student.module';
import { PrismaExceptionFilter } from './prisma/prisma-exception.filter';
import { ModelsModule } from './models/models.module';
import { PromptsModule } from './prompts/prompts.module';
import { ChainsService } from './chains/chains.service';
import { ChainsController } from './chains/chains.controller';
import { ChainsModule } from './chains/chains.module';
import { AgentsModule } from './agents/agents.module';

@Module({
  imports: [CourseModule, StudentModule, ModelsModule, PromptsModule, ChainsModule, AgentsModule],
  controllers: [AppController, ChainsController],
  providers: [
    AppService,
    {
      provide: APP_PIPE,
      useFactory: () =>
        new ValidationPipe({
          transform: true,
          whitelist: true,
          forbidNonWhitelisted: true,
        }),
    },
    { provide: APP_FILTER, useClass: PrismaExceptionFilter },
    ChainsService,
  ],
})
export class AppModule {}
