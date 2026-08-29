import { CreateDateColumn, Entity, PrimaryColumn } from "typeorm";

@Entity({ name: "user_roles" })
export class UserRoleEntity {
  @PrimaryColumn({ name: "user_id", type: "uuid" }) userId!: string;
  @PrimaryColumn({ name: "role_id", type: "uuid" }) roleId!: string;
  @CreateDateColumn({ name: "assigned_at", type: "timestamptz" })
  assignedAt!: Date;
}
