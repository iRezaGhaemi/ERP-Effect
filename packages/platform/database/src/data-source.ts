import "reflect-metadata";

import { DataSource } from "typeorm";

import { entityRegistry } from "./entity-registry.js";
import { CreateUsers202608280001 } from "./migrations/202608280001-create-users.js";
import { CreateAuditLogs202608280002 } from "./migrations/202608280002-create-audit-logs.js";
import { ReconcileAuditLogsActorNull202608280003 } from "./migrations/202608280003-reconcile-audit-logs-actor-null.js";
import { HardenAuditLogBoundary202608280004 } from "./migrations/202608280004-harden-audit-log-boundary.js";
import { CreateAccessControl202608280005 } from "./migrations/202608280005-create-access-control.js";
import { CreateOtp202608280006 } from "./migrations/202608280006-create-otp.js";

export type DatabaseOptions = {
  url: string;
};

export function createDataSource(options: DatabaseOptions): DataSource {
  return new DataSource({
    type: "postgres",
    url: options.url,
    entities: entityRegistry,
    migrations: [
      CreateUsers202608280001,
      CreateAuditLogs202608280002,
      ReconcileAuditLogsActorNull202608280003,
      HardenAuditLogBoundary202608280004,
      CreateAccessControl202608280005,
      CreateOtp202608280006,
    ],
    synchronize: false,
  });
}
