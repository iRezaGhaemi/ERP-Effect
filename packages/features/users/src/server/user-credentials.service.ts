import { DomainError } from "@effect-erp/contracts";
import { Injectable } from "@nestjs/common";
import { DataSource, type EntityManager } from "typeorm";

import { UsernameSchema } from "../contracts/index.js";
import { UserEntity } from "../entities/index.js";

const TEMPORARY_PASSWORD_TTL_MS = 24 * 60 * 60 * 1_000;

@Injectable()
export class UserCredentialsService {
  constructor(private readonly dataSource: DataSource) {}

  async findByUsername(
    username: string,
    manager?: EntityManager,
  ): Promise<UserEntity | null> {
    const canonicalUsername = UsernameSchema.parse(username);
    return (manager ?? this.dataSource.manager)
      .getRepository(UserEntity)
      .createQueryBuilder("user")
      .addSelect("user.passwordHash")
      .where("user.username = :username", { username: canonicalUsername })
      .getOne();
  }

  async lockById(
    id: string,
    manager: EntityManager,
  ): Promise<UserEntity | null> {
    return manager
      .getRepository(UserEntity)
      .createQueryBuilder("user")
      .addSelect("user.passwordHash")
      .where("user.id = :id", { id })
      .setLock("pessimistic_write")
      .getOne();
  }

  async setTemporary(
    user: UserEntity,
    username: string,
    hash: string,
    manager: EntityManager,
  ): Promise<UserEntity> {
    const canonicalUsername = UsernameSchema.parse(username);
    if (user.username !== null && user.username !== canonicalUsername) {
      throw new DomainError(
        "USERNAME_IMMUTABLE",
        "نام کاربری پس از تخصیص قابل تغییر نیست.",
      );
    }

    const changedAt = new Date();
    user.username = canonicalUsername;
    user.passwordHash = hash;
    user.mustChangePassword = true;
    user.temporaryPasswordExpiresAt = new Date(
      changedAt.getTime() + TEMPORARY_PASSWORD_TTL_MS,
    );
    user.passwordChangedAt = changedAt;
    user.credentialVersion += 1;
    return manager.getRepository(UserEntity).save(user);
  }

  async setPermanent(
    user: UserEntity,
    hash: string,
    manager: EntityManager,
  ): Promise<UserEntity> {
    user.passwordHash = hash;
    user.mustChangePassword = false;
    user.temporaryPasswordExpiresAt = null;
    user.passwordChangedAt = new Date();
    user.credentialVersion += 1;
    return manager.getRepository(UserEntity).save(user);
  }
}
