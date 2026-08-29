import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateAccessControl202608280005 implements MigrationInterface {
  name = "CreateAccessControl202608280005";
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "permission_effect" AS ENUM ('ALLOW', 'DENY')`,
    );
    await queryRunner.query(
      `CREATE TABLE "roles" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" varchar(80) NOT NULL, "slug" varchar(80) NOT NULL, "is_system" boolean NOT NULL DEFAULT false, "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(), CONSTRAINT "PK_roles_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_roles_slug" ON "roles" ("slug")`,
    );
    await queryRunner.query(
      `CREATE TABLE "permissions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "resource" varchar(80) NOT NULL, "action" varchar(80) NOT NULL, "key" varchar(161) NOT NULL, "created_at" timestamptz NOT NULL DEFAULT now(), CONSTRAINT "PK_permissions_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_permissions_key" ON "permissions" ("key")`,
    );
    await queryRunner.query(
      `CREATE TABLE "user_roles" ("user_id" uuid NOT NULL, "role_id" uuid NOT NULL, "assigned_at" timestamptz NOT NULL DEFAULT now(), CONSTRAINT "PK_user_roles" PRIMARY KEY ("user_id", "role_id"), CONSTRAINT "FK_user_roles_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE, CONSTRAINT "FK_user_roles_role" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE)`,
    );
    await queryRunner.query(
      `CREATE INDEX "ix_user_roles_role_id" ON "user_roles" ("role_id")`,
    );
    await queryRunner.query(
      `CREATE TABLE "role_permissions" ("role_id" uuid NOT NULL, "permission_id" uuid NOT NULL, CONSTRAINT "PK_role_permissions" PRIMARY KEY ("role_id", "permission_id"), CONSTRAINT "FK_role_permissions_role" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE, CONSTRAINT "FK_role_permissions_permission" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE)`,
    );
    await queryRunner.query(
      `CREATE INDEX "ix_role_permissions_permission_id" ON "role_permissions" ("permission_id")`,
    );
    await queryRunner.query(
      `CREATE TABLE "user_permission_overrides" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "permission_id" uuid NOT NULL, "effect" "permission_effect" NOT NULL, CONSTRAINT "PK_user_permission_overrides_id" PRIMARY KEY ("id"), CONSTRAINT "FK_user_permission_overrides_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE, CONSTRAINT "FK_user_permission_overrides_permission" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE)`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_user_permission_overrides_user_permission" ON "user_permission_overrides" ("user_id", "permission_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "ix_user_permission_overrides_permission_id" ON "user_permission_overrides" ("permission_id")`,
    );
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "user_permission_overrides"`);
    await queryRunner.query(`DROP TABLE "role_permissions"`);
    await queryRunner.query(`DROP TABLE "user_roles"`);
    await queryRunner.query(`DROP TABLE "permissions"`);
    await queryRunner.query(`DROP TABLE "roles"`);
    await queryRunner.query(`DROP TYPE "permission_effect"`);
  }
}
