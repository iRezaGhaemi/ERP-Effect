import { Module } from '@nestjs/common';
import { AuditModule } from '@effect/audit/server';
import { parseEnv } from '@effect-erp/config';
import { createDataSource, DatabaseModule } from '@effect-erp/database';
import { UsersModule } from '@effect/users/server';

import { HealthController } from './health/health.controller.js';
import { HealthService } from './health/health.service.js';

@Module({
  imports: [
    DatabaseModule.forRoot({
      createDataSource: () => createDataSource({ url: parseEnv(process.env).DATABASE_URL }),
    }),
    AuditModule,
    UsersModule,
  ],
  controllers: [HealthController],
  providers: [HealthService],
})
export class AppModule {}
