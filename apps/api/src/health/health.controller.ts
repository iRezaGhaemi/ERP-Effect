import { Controller, Get } from "@nestjs/common";
import type { HealthResponse } from "@effect-erp/contracts";
import { Public } from "@effect/auth/server";

import { HealthService } from "./health.service.js";

@Controller("health")
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get("live")
  @Public()
  liveness(): HealthResponse {
    return this.healthService.liveness();
  }

  @Get("ready")
  @Public()
  readiness(): Promise<HealthResponse> {
    return this.healthService.readiness();
  }
}
