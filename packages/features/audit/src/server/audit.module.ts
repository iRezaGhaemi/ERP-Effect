import { Module } from "@nestjs/common";

import { AuditController } from "./audit.controller.js";
import { AuditQueryService } from "./audit-query.service.js";
import { AuditWriter } from "./audit-writer.js";

@Module({
  controllers: [AuditController],
  providers: [AuditQueryService, AuditWriter],
  exports: [AuditQueryService, AuditWriter],
})
export class AuditModule {}
