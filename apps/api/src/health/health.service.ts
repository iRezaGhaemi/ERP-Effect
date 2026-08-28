import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import type { HealthResponse } from '@effect-erp/contracts';
import { DataSource } from 'typeorm';

@Injectable()
export class HealthService {
  constructor(private readonly dataSource: DataSource) {}

  liveness(): HealthResponse {
    return { status: 'ok' };
  }

  async readiness(): Promise<HealthResponse> {
    try {
      await this.dataSource.query('SELECT 1');
      return { status: 'ok', checks: { database: 'up' } };
    } catch {
      throw new ServiceUnavailableException({ status: 'error', checks: { database: 'down' } });
    }
  }
}
