import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';
import type { LoggerService } from '@nestjs/common';
import { parseEnv } from '@effect-erp/config';
import { createAppLogger } from '@effect-erp/logger';
import { DataSource } from 'typeorm';

import { AppModule } from './app.module.js';

async function bootstrap(): Promise<void> {
  const env = parseEnv(process.env);
  const logger = createAppLogger();
  const nestLogger: LoggerService = {
    log: logger.info.bind(logger),
    error: logger.error.bind(logger),
    warn: logger.warn.bind(logger),
    debug: logger.debug.bind(logger),
    verbose: logger.trace.bind(logger),
    fatal: logger.fatal.bind(logger),
  };
  const app = await NestFactory.create(AppModule, { logger: nestLogger });
  app.setGlobalPrefix('api/v1');

  const dataSource = app.get(DataSource);
  await dataSource.initialize();
  app.enableShutdownHooks();

  await app.listen(env.API_PORT, '0.0.0.0');
}

void bootstrap();
