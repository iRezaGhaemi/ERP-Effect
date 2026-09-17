import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from "typeorm";

export type SessionRevocationReason =
  | "LOGOUT"
  | "LOGOUT_ALL"
  | "ADMIN_REVOKED"
  | "REFRESH_REUSE"
  | "SESSION_EXPIRED"
  | "USER_SUSPENDED"
  | "AUTH_METHOD_CHANGED"
  | "PASSWORD_CHANGED"
  | "PASSWORD_RESET";

@Entity({ name: "sessions" })
@Index("ix_sessions_user_active", ["userId"], {
  where: `"revoked_at" IS NULL`,
})
@Index("ix_sessions_user_last_used_at", ["userId", "lastUsedAt"])
@Index("ix_sessions_expires_at", ["expiresAt"])
export class SessionEntity {
  @PrimaryColumn({ type: "uuid" })
  id!: string;

  @Column({ name: "user_id", type: "uuid" })
  userId!: string;

  @Column({ name: "credential_version", type: "integer", default: 0 })
  credentialVersion!: number;

  @Column({ name: "user_agent", type: "varchar", length: 512 })
  userAgent!: string;

  @Column({ name: "ip_address", type: "inet" })
  ipAddress!: string;

  @Column({ name: "csrf_hash", type: "char", length: 64 })
  csrfHash!: string;

  @Column({ name: "last_used_at", type: "timestamptz" })
  lastUsedAt!: Date;

  @Column({ name: "expires_at", type: "timestamptz" })
  expiresAt!: Date;

  @Column({ name: "revoked_at", type: "timestamptz", nullable: true })
  revokedAt!: Date | null;

  @Column({
    name: "revoked_reason",
    type: "varchar",
    length: 40,
    nullable: true,
  })
  revokedReason!: SessionRevocationReason | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}
