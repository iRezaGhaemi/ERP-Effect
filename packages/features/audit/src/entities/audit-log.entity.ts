import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity({ name: "audit_logs" })
@Index("ix_audit_logs_created_at_id", ["createdAt", "id"])
@Index("ix_audit_logs_actor_id", ["actorId"])
@Index("ix_audit_logs_action", ["action"])
@Index("ix_audit_logs_entity_type_entity_id", ["entityType", "entityId"])
export class AuditLogEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "actor_id", type: "uuid", nullable: true })
  actorId!: string | null;

  @Column({ type: "varchar", length: 120 })
  action!: string;

  @Column({ name: "entity_type", type: "varchar", length: 120 })
  entityType!: string;

  @Column({ name: "entity_id", type: "uuid", nullable: true })
  entityId!: string | null;

  @Column({ type: "jsonb" })
  metadata!: Record<string, unknown>;

  @Column({ name: "ip_address", type: "inet", nullable: true })
  ipAddress!: string | null;

  @Column({ name: "request_id", type: "varchar", length: 120 })
  requestId!: string;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}
