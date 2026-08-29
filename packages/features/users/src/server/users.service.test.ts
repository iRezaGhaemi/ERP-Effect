import { randomUUID } from "node:crypto";

import type { EntityManager } from "typeorm";
import { describe, expect, it, vi } from "vitest";

import { UserEntity, UserStatus } from "../entities/index.js";
import { normalizeIranianMobile } from "./phone.js";
import { UsersFacade, UsersService } from "./users.service.js";

const actorId = "c411ff93-44ff-4d54-aea6-27650a286ccd";

function createManager(): EntityManager {
  const users: UserEntity[] = [];
  const repository = {
    create(
      values: Pick<UserEntity, "phone" | "firstName" | "lastName" | "status">,
    ): UserEntity {
      return Object.assign(new UserEntity(), {
        id: randomUUID(),
        ...values,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    },
    async save(user: UserEntity): Promise<UserEntity> {
      if (users.some((existing) => existing.phone === user.phone)) {
        throw Object.assign(new Error("duplicate phone"), { code: "23505" });
      }

      users.push(user);
      return user;
    },
    async findOneBy(
      criteria: Partial<Pick<UserEntity, "phone" | "status">>,
    ): Promise<UserEntity | null> {
      return (
        users.find(
          (user) =>
            (criteria.phone === undefined || user.phone === criteria.phone) &&
            (criteria.status === undefined || user.status === criteria.status),
        ) ?? null
      );
    },
  };

  return { getRepository: () => repository } as unknown as EntityManager;
}

describe("users service", () => {
  it.each([
    ["۰۹۱۲۱۲۳۴۵۶۷", "+989121234567"],
    ["09121234567", "+989121234567"],
    ["00989121234567", "+989121234567"],
    ["+989121234567", "+989121234567"],
  ])("normalizes %s", (input, expected) => {
    expect(normalizeIranianMobile(input)).toBe(expected);
  });

  it("enforces unique normalized phone numbers", async () => {
    const manager = createManager();
    const service = new UsersService(
      {
        transaction: (work: (manager: EntityManager) => unknown) =>
          work(manager),
      } as never,
      { write: vi.fn() } as never,
    );

    await service.create(
      { phone: "09121234567", firstName: "رضا", lastName: "قایمی" },
      actorId,
    );

    await expect(
      service.create(
        { phone: "+989121234567", firstName: "رضا", lastName: "دوم" },
        actorId,
      ),
    ).rejects.toMatchObject({ code: "PHONE_ALREADY_EXISTS" });
  });

  it("returns null for suspended users through the active-user facade", async () => {
    const manager = createManager();
    const service = new UsersService(
      {
        transaction: (work: (manager: EntityManager) => unknown) =>
          work(manager),
      } as never,
      { write: vi.fn() } as never,
    );
    const facade = new UsersFacade({ manager } as never);
    const user = await service.create(
      { phone: "09121234567", firstName: "رضا", lastName: "قایمی" },
      actorId,
      manager,
    );
    user.status = UserStatus.SUSPENDED;

    expect(await facade.findActiveByPhone("09121234567", manager)).toBeNull();
    expect(await facade.findActiveByPhone("09129999999", manager)).toBeNull();
  });
});
