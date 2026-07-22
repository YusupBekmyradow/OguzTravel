import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { LoggerInterceptor } from './common/interceptors/logger.interceptor';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { join } from 'path';
import * as express from 'express';
import { AllExceptionsFilter } from './filters/all-exceptions.filter';

async function zero() {
  const logger = new Logger('monster');

  const app = await NestFactory.create<NestExpressApplication>(
    AppModule,
    { logger: ['error', 'warn', 'log', 'debug', 'verbose'] },
  );

  app.enableCors();

  app.getHttpAdapter().getInstance().set('trust proxy', true);
  const isProd = process.env.NODE_ENV === 'production';
  app.set('trust proxy', isProd ? 1 : true);

  app.useGlobalPipes(new ValidationPipe());
  app.useGlobalInterceptors(new LoggerInterceptor());
  app.useGlobalInterceptors(new ResponseInterceptor());

  app.use('/uploads', express.static(join(process.cwd(), '..', 'uploads')));

  app.setGlobalPrefix('api/v1');
  app.useGlobalFilters(new AllExceptionsFilter());
  const config = new DocumentBuilder()
    .setTitle('Monster')
    .setDescription('Api Documentation')
    .setVersion('1.0')
    .addApiKey(
      {
        type: 'apiKey',
        name: 'Accept-Language',
        in: 'header',
        description: 'Select language (tk, en, ru)',
      },
      'Accept-Language',
    )
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      'bearerAuth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.NODE_PORT || 3000;
  await app.listen(port, '0.0.0.0');

  logger.log(`Project running on port ${port} in ${process.env.NODE_ENV} mode`);

  const url = await app.getUrl();
  console.log(`Application is running: ${url}`);
  console.log(`Swagger Documentation: ${url}/docs`);
}
zero();