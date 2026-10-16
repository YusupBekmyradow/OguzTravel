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
import { Sequelize } from 'sequelize';

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




  try {
    const sequelize = app.get(Sequelize);
    if (sequelize) {
      await sequelize.query(`
        DO $$
        DECLARE
            r RECORD;
        BEGIN
            FOR r IN 
                SELECT 
                    n.nspname AS schema_name,
                    c.relname AS table_name,
                    a.attname AS column_name,
                    s.relname AS sequence_name
                FROM pg_class c
                JOIN pg_namespace n ON n.oid = c.relnamespace
                JOIN pg_attribute a ON a.attrelid = c.oid
                JOIN pg_depend d ON d.refobjid = c.oid AND d.refobjsubid = a.attnum
                JOIN pg_class s ON s.oid = d.objid
                WHERE n.nspname = 'public' 
                  AND s.relkind = 'S' 
                  AND a.attnum > 0 
                  AND NOT a.attisdropped
            LOOP
                EXECUTE format(
                    'SELECT setval(%L, COALESCE((SELECT MAX(%I) FROM %I.%I), 1))',
                    r.schema_name || '.' || r.sequence_name,
                    r.column_name,
                    r.schema_name,
                    r.table_name
                );
            END LOOP;
        END $$;
      `);
    }
  } catch (error) {
    console.error('Sequence error:', error);
  }



  const port = process.env.NODE_PORT || 3000;
  await app.listen(port, '0.0.0.0');

  logger.log(`Project running on port ${port} in ${process.env.NODE_ENV} mode`);

  const url = await app.getUrl();
  console.log(`Application is running: ${url}`);
  console.log(`Swagger Documentation: ${url}/docs`);
}
zero();