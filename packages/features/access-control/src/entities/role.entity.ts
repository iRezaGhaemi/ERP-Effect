import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity({ name: "roles" })
@Index("uq_roles_slug", ["slug"], { unique: true })
export class RoleEntity {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column({ type: "varchar", length: 80 }) name!: string;
  @Column({ type: "varchar", length: 80 }) slug!: string;
  @Column({ name: "is_system", type: "boolean", default: false })
  isSystem!: boolean;
  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;
}
