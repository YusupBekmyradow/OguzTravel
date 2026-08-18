import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { I18nValidationPipe } from 'nestjs-i18n';
import { Logger } from '@nestjs/common';
import { LoggerInterceptor } from './common/interceptors/logger.interceptor';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { join } from 'path';
import * as express from 'express';
import helmet from 'helmet';
import compression from 'compression';

async function zero() {
  const logger = new Logger('monster');

  const app = await NestFactory.create<NestExpressApplication>(
    AppModule,
    { logger: ['error', 'warn', 'log', 'debug', 'verbose'] },
  );

  app.enableCors();

  const isProd = process.env.NODE_ENV === 'production';
  app.set('trust proxy', isProd ? 1 : true);
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(compression());
  app.useGlobalPipes(new I18nValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalInterceptors(new LoggerInterceptor());
  app.useGlobalInterceptors(new ResponseInterceptor());

  app.use('/uploads', express.static(join(process.cwd(), 'uploads')));
  app.use('/uploads', express.static(join(process.cwd(), '..', 'uploads')));

  app.setGlobalPrefix('api/v1');
  const config = new DocumentBuilder()
    .setTitle('Monster')
    .setDescription('Api Documentation')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      'bearerAuth',
    )
    .addGlobalParameters({
      name: 'lang',
      in: 'header',
      required: false,
      schema: {
        type: 'string',
        enum: ['tk', 'en', 'ru'],
        default: 'tk',
      },
      description: 'Language selection: tk (Turkmen), en (English), ru (Russian)',
    })
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



// indexing goymali
// migration yazmaly
// cors request haysy apilere izin bermeli
// message responseleri dogry edip duzeltmeli catylmadyklary hem bar
// payment uytgedip bolmayar