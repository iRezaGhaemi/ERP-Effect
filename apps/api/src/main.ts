import "reflect-metadata";

import { NestFactory } from "@nestjs/core";
import type { INestApplication, LoggerService } from "@nestjs/common";
import { parseEnv } from "@effect-erp/config";
import { createAppLogger } from "@effect-erp/logger";
import { DataSource } from "typeorm";
import { assertAuditDatabaseBoundary } from "@effect/audit/server";

import { AppModule } from "./app.module.js";

export function configureHttpApp(app: INestApplication): void {
  app.setGlobalPrefix("api/v1");
}

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
  configureHttpApp(app);

  const dataSource = app.get(DataSource);
  await dataSource.initialize();
  await assertAuditDatabaseBoundary(dataSource);
  app.enableShutdownHooks();

  await app.listen(env.API_PORT, "0.0.0.0");
}

void bootstrap();
