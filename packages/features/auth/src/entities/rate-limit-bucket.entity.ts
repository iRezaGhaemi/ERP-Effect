import {
  Column,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "rate_limit_buckets" })
@Index("ix_rate_limit_buckets_blocked_until", ["blockedUntil"])
export class RateLimitBucketEntity {
  @PrimaryColumn({ type: "varchar", length: 32 })
  scope!: string;

  @PrimaryColumn({ name: "key_hash", type: "char", length: 64 })
  keyHash!: string;

  @Column({ name: "window_started_at", type: "timestamptz" })
  windowStartedAt!: Date;

  @Column({ name: "request_count", type: "integer" })
  requestCount!: number;

  @Column({ name: "blocked_until", type: "timestamptz", nullable: true })
  blockedUntil!: Date | null;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;
}
