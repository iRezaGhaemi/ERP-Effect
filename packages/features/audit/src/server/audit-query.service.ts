import type { Page } from "@effect-erp/contracts";
import { Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";

import {
  AuditQuerySchema,
  type AuditLogDto,
  type AuditQuery,
} from "../contracts/index.js";
import { AuditLogEntity } from "../entities/index.js";

const MAX_PAGE_SIZE = 100;

function toAuditLogDto(log: AuditLogEntity): AuditLogDto {
  return {
    id: log.id,
    actorId: log.actorId,
    action: log.action,
    entityType: log.entityType,
    entityId: log.entityId,
    metadata: log.metadata,
    ipAddress: log.ipAddress,
    requestId: log.requestId,
    createdAt: log.createdAt.toISOString(),
  };
}

@Injectable()
export class AuditQueryService {
  constructor(private readonly dataSource: DataSource) {}

  async list(query: AuditQuery): Promise<Page<AuditLogDto>> {
    const values = AuditQuerySchema.parse(query);
    const pageSize = Math.min(values.pageSize, MAX_PAGE_SIZE);
    const [logs, total] = await this.dataSource.manager
      .getRepository(AuditLogEntity)
      .findAndCount({
        order: { createdAt: "DESC", id: "DESC" },
        skip: (values.page - 1) * pageSize,
        take: pageSize,
      });

    return {
      items: logs.map(toAuditLogDto),
      meta: {
        page: values.page,
        pageSize,
        total,
        pageCount: Math.ceil(total / pageSize),
      },
    };
  }
}
