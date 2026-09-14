import { Test, TestingModule } from '@nestjs/testing';
import { ModelsController } from './models.controller';
import { ModelsService } from './models.service';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';

describe('ModelsController', () => {
  let controller: ModelsController;
  let app: INestApplication;
  const models_service = { baseChat: jest.fn(), chatSystem: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ModelsController],
      providers: [{ provide: ModelsService, useValue: models_service }],
    }).compile();

    controller = module.get<ModelsController>(ModelsController);
    models_service.baseChat.mockReset();
    models_service.chatSystem.mockReset();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it.each([
    {},
    { message: null },
    { message: 123 },
    { message: '' },
    { message: '   ' },
  ])('rejects invalid chat body %j', async (request_body) => {
    await request(app.getHttpServer())
      .post('/models/chat')
      .send(request_body)
      .expect(400);
    expect(models_service.baseChat).not.toHaveBeenCalled();
  });

  it('passes a valid message to the service', async () => {
    models_service.baseChat.mockResolvedValue({
      question: '你好',
      answer: '你好！',
    });
    await request(app.getHttpServer())
      .post('/models/chat')
      .send({ message: '你好' })
      .expect(201)
      .expect({ question: '你好', answer: '你好！' });
    expect(models_service.baseChat).toHaveBeenCalledWith('你好');
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it.each([
    {},
    { system: 'Be helpful' },
    { message: 'Hello' },
    ...[undefined, null, 123, '', '   '].flatMap((invalid_value) => [
      { system: 'Be helpful', message: invalid_value },
      { system: invalid_value, message: 'Hello' },
    ]),
  ])('rejects invalid system chat body %j', async (request_body) => {
    await request(app.getHttpServer())
      .post('/models/chat-system')
      .send(request_body)
      .expect(400);
    expect(models_service.chatSystem).not.toHaveBeenCalled();
  });

  it('passes system and message to the service', async () => {
    const request_body = { system: 'Be helpful', message: 'Hello' };
    const response_body = {
      system: 'Be helpful',
      question: 'Hello',
      answer: 'Hi',
    };
    models_service.chatSystem.mockResolvedValue(response_body);
    await request(app.getHttpServer())
      .post('/models/chat-system')
      .send(request_body)
      .expect(201)
      .expect(response_body);
    expect(models_service.chatSystem).toHaveBeenCalledWith(request_body);
  });
});
