import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

export enum PermissionEffect {
  ALLOW = "ALLOW",
  DENY = "DENY",
}

@Entity({ name: "user_permission_overrides" })
@Index(
  "uq_user_permission_overrides_user_permission",
  ["userId", "permissionId"],
  { unique: true },
)
export class UserPermissionOverrideEntity {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column({ name: "user_id", type: "uuid" }) userId!: string;
  @Column({ name: "permission_id", type: "uuid" }) permissionId!: string;
  @Column({
    type: "enum",
    enum: PermissionEffect,
    enumName: "permission_effect",
  })
  effect!: PermissionEffect;
}
