import { ZodValidationPipe } from "@effect-erp/contracts/server";
import { Controller, Get, Query, SetMetadata } from "@nestjs/common";

import { AuditQuerySchema, type AuditQuery } from "../contracts/index.js";
import { AuditQueryService } from "./audit-query.service.js";

const RequirePermission = (key: string): MethodDecorator =>
  SetMetadata("effect:required-permission", key);

@Controller("audit-logs")
export class AuditController {
  constructor(private readonly queryService: AuditQueryService) {}
  @Get()
  @RequirePermission("audit:read")
  async list(
    @Query(new ZodValidationPipe(AuditQuerySchema)) query: AuditQuery,
  ) {
    return this.queryService.list(query);
  }
}
