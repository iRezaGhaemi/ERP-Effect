import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity({ name: "permissions" })
@Index("uq_permissions_key", ["key"], { unique: true })
export class PermissionEntity {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column({ type: "varchar", length: 80 }) resource!: string;
  @Column({ type: "varchar", length: 80 }) action!: string;
  @Column({ type: "varchar", length: 161 }) key!: string;
  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}
