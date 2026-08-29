import type { DataSource } from "typeorm";

type AuditDatabaseRole = {
  roleName: string;
  isSuperuser: boolean;
  canCreateRoles: boolean;
  bypassesRowSecurity: boolean;
  isAuditOwnerMember: boolean;
  ownsAuditLogs: boolean;
  canCreateInPublic: boolean;
  canCreateAuditTriggers: boolean;
};

const unsafeAuditDatabaseRoleError = "Unsafe audit database role.";

export async function assertAuditDatabaseBoundary(
  dataSource: DataSource,
): Promise<void> {
  const [role] = await dataSource.query<AuditDatabaseRole[]>(`
    SELECT
      current_user AS "roleName",
      roles.rolsuper AS "isSuperuser",
      roles.rolcreaterole AS "canCreateRoles",
      roles.rolbypassrls AS "bypassesRowSecurity",
      pg_has_role(current_user, 'effect_audit_owner', 'MEMBER') AS "isAuditOwnerMember",
      pg_get_userbyid(audit_logs.relowner) = current_user AS "ownsAuditLogs",
      has_schema_privilege(current_user, 'public', 'CREATE') AS "canCreateInPublic",
      has_table_privilege(current_user, 'audit_logs', 'TRIGGER') AS "canCreateAuditTriggers"
    FROM pg_roles AS roles
    CROSS JOIN pg_class AS audit_logs
    WHERE roles.rolname = current_user
      AND audit_logs.oid = 'public.audit_logs'::regclass
  `);

  if (
    role === undefined ||
    role.isSuperuser ||
    role.canCreateRoles ||
    role.bypassesRowSecurity ||
    role.isAuditOwnerMember ||
    role.ownsAuditLogs ||
    role.canCreateInPublic ||
    role.canCreateAuditTriggers
  ) {
    throw new Error(unsafeAuditDatabaseRoleError);
  }
}
