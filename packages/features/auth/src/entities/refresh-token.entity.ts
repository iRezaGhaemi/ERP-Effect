import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from "typeorm";

@Entity({ name: "refresh_tokens" })
@Index("uq_refresh_tokens_token_hash", ["tokenHash"], { unique: true })
@Index("ix_refresh_tokens_session_active", ["sessionId", "revokedAt"])
@Index("ix_refresh_tokens_expires_at", ["expiresAt"])
export class RefreshTokenEntity {
  @PrimaryColumn({ type: "uuid" })
  id!: string;

  @Column({ name: "session_id", type: "uuid" })
  sessionId!: string;

  @Column({ name: "token_hash", type: "char", length: 64 })
  tokenHash!: string;

  @Column({ name: "expires_at", type: "timestamptz" })
  expiresAt!: Date;

  @Column({ name: "consumed_at", type: "timestamptz", nullable: true })
  consumedAt!: Date | null;

  @Column({ name: "revoked_at", type: "timestamptz", nullable: true })
  revokedAt!: Date | null;

  @Column({ name: "replaced_by_token_id", type: "uuid", nullable: true })
  replacedByTokenId!: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}
