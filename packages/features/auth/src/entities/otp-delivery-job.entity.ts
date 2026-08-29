import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm";

export type OtpDeliveryJobStatus =
  | "PENDING"
  | "PROCESSING"
  | "AUDIT_PENDING"
  | "SUCCEEDED"
  | "FAILED"
  | "DISCARDED";

@Entity({ name: "otp_delivery_jobs" })
@Index("UQ_otp_delivery_jobs_challenge_id", ["challengeId"], { unique: true })
@Index("ix_otp_delivery_jobs_ready", ["status", "availableAt"])
@Index("ix_otp_delivery_jobs_lease_expires_at", ["leaseExpiresAt"])
@Index("ix_otp_delivery_jobs_cleanup", ["status", "completedAt", "updatedAt"])
@Check(
  "CK_otp_delivery_jobs_status",
  `"status" IN ('PENDING', 'PROCESSING', 'AUDIT_PENDING', 'SUCCEEDED', 'FAILED', 'DISCARDED')`,
)
@Check(
  "CK_otp_delivery_jobs_sealed_fields",
  `("code_ciphertext" IS NULL AND "code_nonce" IS NULL AND "code_tag" IS NULL) OR ("code_ciphertext" IS NOT NULL AND "code_nonce" IS NOT NULL AND "code_tag" IS NOT NULL)`,
)
export class OtpDeliveryJobEntity {
  @PrimaryColumn({ type: "uuid" })
  id!: string;

  @Column({ name: "challenge_id", type: "uuid" })
  challengeId!: string;

  @Column({ name: "code_ciphertext", type: "text", nullable: true })
  codeCiphertext!: string | null;

  @Column({ name: "code_nonce", type: "varchar", length: 24, nullable: true })
  codeNonce!: string | null;

  @Column({ name: "code_tag", type: "varchar", length: 24, nullable: true })
  codeTag!: string | null;

  @Column({ name: "request_id", type: "varchar", length: 128 })
  requestId!: string;

  @Column({ type: "varchar", length: 16, default: "PENDING" })
  status!: OtpDeliveryJobStatus;

  @Column({ type: "smallint", default: 0 })
  attempts!: number;

  @Column({ name: "available_at", type: "timestamptz" })
  availableAt!: Date;

  @Column({ name: "lease_expires_at", type: "timestamptz", nullable: true })
  leaseExpiresAt!: Date | null;

  @Column({ name: "lease_token", type: "uuid", nullable: true })
  leaseToken!: string | null;

  @Column({ name: "claim_version", type: "integer", default: 0 })
  claimVersion!: number;

  @Column({ name: "completed_at", type: "timestamptz", nullable: true })
  completedAt!: Date | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;
}
