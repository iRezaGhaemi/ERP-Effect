import { Injectable } from "@nestjs/common";
import { DataSource, type EntityManager } from "typeorm";

import { AuditEventSchema, type AuditEvent } from "../contracts/index.js";
import { AuditLogEntity } from "../entities/index.js";

@Injectable()
export class AuditWriter {
  constructor(private readonly dataSource: DataSource) {}

  async write(event: AuditEvent, manager?: EntityManager): Promise<void> {
    const values = AuditEventSchema.parse(event);
    const repository = (manager ?? this.dataSource.manager).getRepository(
      AuditLogEntity,
    );
    await repository.save(repository.create(values));
  }
}
