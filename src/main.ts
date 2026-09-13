import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

const SERVICE_NAME = process.env.SERVICE_NAME ?? 'app';
const HOST = process.env.HOST ?? 'localhost';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  new Logger(SERVICE_NAME).log(`[${SERVICE_NAME}] http://${HOST}:${port}`);
}
bootstrap();
