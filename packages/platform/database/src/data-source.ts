import "reflect-metadata";

import { DataSource } from "typeorm";

import { entityRegistry } from "./entity-registry.js";
import { CreateUsers202608280001 } from "./migrations/202608280001-create-users.js";
import { CreateAuditLogs202608280002 } from "./migrations/202608280002-create-audit-logs.js";
import { ReconcileAuditLogsActorNull202608280003 } from "./migrations/202608280003-reconcile-audit-logs-actor-null.js";
import { HardenAuditLogBoundary202608280004 } from "./migrations/202608280004-harden-audit-log-boundary.js";
import { CreateAccessControl202608280005 } from "./migrations/202608280005-create-access-control.js";
import { CreateOtp202608280006 } from "./migrations/202608280006-create-otp.js";
import { CreateOtpDeliveryOutbox202608280007 } from "./migrations/202608280007-create-otp-delivery-outbox.js";
import { HardenOtpDeliveryOutbox202608280008 } from "./migrations/202608280008-harden-otp-delivery-outbox.js";
import { CreateSessions202608280009 } from "./migrations/202608280009-create-sessions.js";
import { AddPasswordCredentials202609010010 } from "./migrations/202609010010-add-password-credentials.js";
import { RetireOtp202609010011 } from "./migrations/202609010011-retire-otp.js";

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
      CreateOtpDeliveryOutbox202608280007,
      HardenOtpDeliveryOutbox202608280008,
      CreateSessions202608280009,
      AddPasswordCredentials202609010010,
      RetireOtp202609010011,
    ],
    synchronize: false,
  });
}
