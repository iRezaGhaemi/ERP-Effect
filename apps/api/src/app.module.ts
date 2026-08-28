import { Module } from '@nestjs/common';
import { parseEnv } from '@effect-erp/config';
import { createDataSource } from '@effect-erp/database';
import { DataSource } from 'typeorm';

import { HealthController } from './health/health.controller.js';
import { HealthService } from './health/health.service.js';

@Module({
  controllers: [HealthController],
  providers: [
    HealthService,
    {
      provide: DataSource,
      useFactory: () => createDataSource({ url: parseEnv(process.env).DATABASE_URL }),
    },
  ],
})
export class AppModule {}
