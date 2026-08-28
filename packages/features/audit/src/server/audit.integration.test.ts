import { DataSource } from "typeorm";
import { afterEach, describe, expect, it } from "vitest";

import { startPostgresContainer } from "@effect-erp/testing";

import { AuditLogEntity } from "../entities/index.js";
import { AuditQueryService, AuditWriter } from "./index.js";
import { CreateAuditLogs202608280002 } from "../../../../platform/database/src/migrations/202608280002-create-audit-logs.js";
import { ReconcileAuditLogsActorNull202608280003 } from "../../../../platform/database/src/migrations/202608280003-reconcile-audit-logs-actor-null.js";
import { CreateUsers202608280001 } from "../../../../platform/database/src/migrations/202608280001-create-users.js";
import { UserEntity } from "../../../users/src/entities/index.js";

const dataSources: DataSource[] = [];

afterEach(async () => {
  await Promise.all(
    dataSources.splice(0).map(async (dataSource) => dataSource.destroy()),
  );
});

describe("audit history", () => {
  it("writes system and actor audit records but exposes no mutation API", async () => {
    const container = await startPostgresContainer();
    const dataSource = new DataSource({
      type: "postgres",
      host: container.getHost(),
      port: container.getMappedPort(5432),
      username: "effect",
      password: "effect",
      database: "effect_erp",
      entities: [UserEntity, AuditLogEntity],
      migrations: [
        CreateUsers202608280001,
        CreateAuditLogs202608280002,
        ReconcileAuditLogsActorNull202608280003,
      ],
      synchronize: false,
    });
    dataSources.push(dataSource);

    try {
      await dataSource.initialize();
      await dataSource.runMigrations();

      const writer = new AuditWriter(dataSource);
      const query = new AuditQueryService(dataSource);
      const [actor] = await dataSource.query<{ id: string }[]>(
        `INSERT INTO users (phone, "firstName", "lastName") VALUES ($1, $2, $3) RETURNING id`,
        ["+989121234567", "رضا", "قایمی"],
      );
      expect(actor).toBeDefined();
      await writer.write({
        actorId: null,
        action: "auth.otp_rejected",
        entityType: "auth",
        entityId: null,
        metadata: {},
        ipAddress: "127.0.0.1",
        requestId: "req_1",
      });
      await writer.write({
        actorId: actor!.id,
        action: "users.created",
        entityType: "users",
        entityId: actor!.id,
        metadata: { source: "integration" },
        ipAddress: null,
        requestId: "req_2",
      });

      const page = await query.list({ page: 1, pageSize: 20 });
      expect(page.items).toHaveLength(2);
      expect(page.items.map((item) => item.action)).toContain("auth.otp_rejected");
      expect(page.items.find((item) => item.action === "users.created")?.actorId).toBe(actor!.id);

      await dataSource.query(`DELETE FROM users WHERE id = $1`, [actor!.id]);
      const afterActorDeletion = await query.list({ page: 1, pageSize: 20 });
      expect(afterActorDeletion.items.find((item) => item.action === "users.created")?.actorId).toBeNull();
      await expect(
        dataSource.query("UPDATE audit_logs SET action = 'tampered'"),
      ).rejects.toThrow(/audit_logs are append-only/);
      await expect(dataSource.query("DELETE FROM audit_logs")).rejects.toThrow(
        /audit_logs are append-only/,
      );
    } finally {
      await dataSource.destroy();
      const index = dataSources.indexOf(dataSource);
      if (index >= 0) dataSources.splice(index, 1);
      await container.stop();
    }
  });
});
