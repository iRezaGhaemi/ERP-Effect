import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsers202608280001 implements MigrationInterface {
  name = 'CreateUsers202608280001';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`CREATE TYPE "user_status" AS ENUM ('ACTIVE', 'SUSPENDED')`);
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "phone" character varying(13) NOT NULL,
        "firstName" character varying(80) NOT NULL,
        "lastName" character varying(80) NOT NULL,
        "status" "user_status" NOT NULL DEFAULT 'ACTIVE',
        "lastLoginAt" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX "uq_users_phone" ON "users" ("phone")`);
    await queryRunner.query(`CREATE INDEX "ix_users_status" ON "users" ("status")`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."ix_users_status"`);
    await queryRunner.query(`DROP INDEX "public"."uq_users_phone"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "user_status"`);
  }
}
