import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm";

export type OtpDeliveryJobStatus =
  "PENDING" | "PROCESSING" | "SUCCEEDED" | "FAILED";

@Entity({ name: "otp_delivery_jobs" })
@Index("UQ_otp_delivery_jobs_challenge_id", ["challengeId"], { unique: true })
@Index("ix_otp_delivery_jobs_ready", ["status", "availableAt"])
@Index("ix_otp_delivery_jobs_lease_expires_at", ["leaseExpiresAt"])
export class OtpDeliveryJobEntity {
  @PrimaryColumn({ type: "uuid" })
  id!: string;

  @Column({ name: "challenge_id", type: "uuid" })
  challengeId!: string;

  @Column({ name: "code_ciphertext", type: "text" })
  codeCiphertext!: string;

  @Column({ name: "code_nonce", type: "varchar", length: 24 })
  codeNonce!: string;

  @Column({ name: "code_tag", type: "varchar", length: 24 })
  codeTag!: string;

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

  @Column({ name: "completed_at", type: "timestamptz", nullable: true })
  completedAt!: Date | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;
}
