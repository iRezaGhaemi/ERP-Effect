import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from "typeorm";

@Entity({ name: "otp_challenges" })
@Index("ix_otp_challenges_phone_created_at", ["phone", "createdAt"])
@Index("ix_otp_challenges_expires_at", ["expiresAt"])
export class OtpChallengeEntity {
  @PrimaryColumn({ type: "uuid" })
  id!: string;

  @Column({ name: "user_id", type: "uuid" })
  userId!: string;

  @Column({ type: "varchar", length: 13 })
  phone!: string;

  @Column({ name: "code_hash", type: "char", length: 64 })
  codeHash!: string;

  @Column({ type: "smallint", default: 0 })
  attempts!: number;

  @Column({ name: "expires_at", type: "timestamptz" })
  expiresAt!: Date;

  @Column({ name: "consumed_at", type: "timestamptz", nullable: true })
  consumedAt!: Date | null;

  @Column({ name: "invalidated_at", type: "timestamptz", nullable: true })
  invalidatedAt!: Date | null;

  @Column({ name: "request_ip", type: "inet" })
  requestIp!: string;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}
