import { Module } from "@nestjs/common";

import { AuditQueryService } from "./audit-query.service.js";
import { AuditWriter } from "./audit-writer.js";

@Module({
  providers: [AuditQueryService, AuditWriter],
  exports: [AuditQueryService, AuditWriter],
})
export class AuditModule {}
