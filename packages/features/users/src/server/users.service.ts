import { randomUUID } from "node:crypto";

import { AuditWriter } from "@effect/audit/server";
import { DomainError, type Page } from "@effect-erp/contracts";
import { Injectable } from "@nestjs/common";
import { DataSource, type EntityManager } from "typeorm";

import {
  CreateUserSchema,
  UpdateUserSchema,
  type CreateUserInput,
  type UpdateUserInput,
  type UserPageQuery,
} from "../contracts/index.js";
import { UserEntity, UserStatus } from "../entities/index.js";
import { normalizeIranianMobile } from "./phone.js";

function isPostgresUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

function requestId(): string {
  return `domain_${randomUUID()}`;
}

@Injectable()
export class UsersFacade {
  constructor(private readonly dataSource: DataSource) {}
  async findActiveByPhone(
    phone: string,
    manager?: EntityManager,
  ): Promise<UserEntity | null> {
    return (manager ?? this.dataSource.manager)
      .getRepository(UserEntity)
      .findOneBy({
        phone: normalizeIranianMobile(phone),
        status: UserStatus.ACTIVE,
      });
  }
}

@Injectable()
export class UsersService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly auditWriter: AuditWriter,
  ) {}

  async create(
    input: CreateUserInput,
    actorId: string,
    manager?: EntityManager,
  ): Promise<UserEntity> {
    const values = CreateUserSchema.parse(input);
    try {
      const work = async (transactionManager: EntityManager) => {
        const repository = transactionManager.getRepository(UserEntity);
        const user = await repository.save(
          repository.create({
            phone: normalizeIranianMobile(values.phone),
            firstName: values.firstName,
            lastName: values.lastName,
            status: UserStatus.ACTIVE,
          }),
        );
        await this.auditWriter.write(
          {
            actorId,
            action: "users.created",
            entityType: "users",
            entityId: user.id,
            metadata: {},
            ipAddress: null,
            requestId: requestId(),
          },
          transactionManager,
        );
        return user;
      };
      return manager
        ? await work(manager)
        : await this.dataSource.transaction(work);
    } catch (error) {
      if (isPostgresUniqueViolation(error))
        throw new DomainError(
          "PHONE_ALREADY_EXISTS",
          "شماره موبایل قبلاً ثبت شده است.",
        );
      throw error;
    }
  }

  async list(query: UserPageQuery): Promise<Page<UserEntity>> {
    const [items, total] = await this.dataSource.manager
      .getRepository(UserEntity)
      .findAndCount({
        order: { createdAt: "ASC", id: "ASC" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      });
    return {
      items,
      meta: { ...query, total, pageCount: Math.ceil(total / query.pageSize) },
    };
  }

  async get(id: string): Promise<UserEntity> {
    const user = await this.dataSource.manager
      .getRepository(UserEntity)
      .findOneBy({ id });
    if (!user) throw new DomainError("USER_NOT_FOUND", "کاربر پیدا نشد.");
    return user;
  }

  async update(
    id: string,
    input: UpdateUserInput,
    actorId: string,
  ): Promise<UserEntity> {
    const values = UpdateUserSchema.parse(input);
    try {
      return await this.dataSource.transaction(async (manager) => {
        const repository = manager.getRepository(UserEntity);
        const user = await repository.findOne({
          where: { id },
          lock: { mode: "pessimistic_write" },
        });
        if (!user) throw new DomainError("USER_NOT_FOUND", "کاربر پیدا نشد.");
        if (values.phone !== undefined)
          user.phone = normalizeIranianMobile(values.phone);
        if (values.firstName !== undefined) user.firstName = values.firstName;
        if (values.lastName !== undefined) user.lastName = values.lastName;
        const saved = await repository.save(user);
        await this.auditWriter.write(
          {
            actorId,
            action: "users.updated",
            entityType: "users",
            entityId: id,
            metadata: {},
            ipAddress: null,
            requestId: requestId(),
          },
          manager,
        );
        return saved;
      });
    } catch (error) {
      if (isPostgresUniqueViolation(error))
        throw new DomainError(
          "PHONE_ALREADY_EXISTS",
          "شماره موبایل قبلاً ثبت شده است.",
        );
      throw error;
    }
  }

  async setStatus(
    id: string,
    status: UserStatus,
    actorId: string,
  ): Promise<UserEntity> {
    return this.dataSource.transaction(async (manager) => {
      await manager.query(
        `SELECT pg_advisory_xact_lock(hashtextextended('active-super-admin', 0))`,
      );
      const repository = manager.getRepository(UserEntity);
      const user = await repository.findOne({
        where: { id },
        lock: { mode: "pessimistic_write" },
      });
      if (!user) throw new DomainError("USER_NOT_FOUND", "کاربر پیدا نشد.");
      if (
        status === UserStatus.SUSPENDED &&
        user.status === UserStatus.ACTIVE
      ) {
        const rows = await manager.query<Array<{ count: string }>>(
          `SELECT COUNT(DISTINCT active_user.id)::text AS count FROM users active_user
           INNER JOIN user_roles assignment ON assignment.user_id = active_user.id
           INNER JOIN roles role ON role.id = assignment.role_id
           WHERE active_user.status = 'ACTIVE' AND role.slug = 'super-admin'
             AND EXISTS (SELECT 1 FROM user_roles target_assignment
               INNER JOIN roles target_role ON target_role.id = target_assignment.role_id
               WHERE target_assignment.user_id = $1 AND target_role.slug = 'super-admin')`,
          [id],
        );
        if (Number(rows[0]?.count ?? 0) === 1) {
          throw new DomainError(
            "LAST_ACTIVE_SUPER_ADMIN",
            "آخرین مدیر ارشد فعال را نمی‌توان تعلیق کرد.",
          );
        }
      }
      user.status = status;
      const saved = await repository.save(user);
      await this.auditWriter.write(
        {
          actorId,
          action:
            status === UserStatus.ACTIVE
              ? "users.activated"
              : "users.suspended",
          entityType: "users",
          entityId: id,
          metadata: { status },
          ipAddress: null,
          requestId: requestId(),
        },
        manager,
      );
      return saved;
    });
  }
}
