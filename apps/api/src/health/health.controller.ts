import { Controller, Get } from '@nestjs/common';
import type { HealthResponse } from '@effect-erp/contracts';

import { HealthService } from './health.service.js';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('live')
  liveness(): HealthResponse {
    return this.healthService.liveness();
  }

  @Get('ready')
  readiness(): Promise<HealthResponse> {
    return this.healthService.readiness();
  }
}
