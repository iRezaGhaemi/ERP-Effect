import { DomainError } from '@effect-erp/contracts';
import { Injectable } from '@nestjs/common';
import { DataSource, type EntityManager } from 'typeorm';

import { CreateUserSchema, type CreateUserInput } from '../contracts/index.js';
import { UserEntity, UserStatus } from '../entities/index.js';
import { normalizeIranianMobile } from './phone.js';

function isPostgresUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505';
}

@Injectable()
export class UsersFacade {
  constructor(private readonly dataSource: DataSource) {}

  async findActiveByPhone(phone: string, manager?: EntityManager): Promise<UserEntity | null> {
    const repository = (manager ?? this.dataSource.manager).getRepository(UserEntity);
    return repository.findOneBy({
      phone: normalizeIranianMobile(phone),
      status: UserStatus.ACTIVE,
    });
  }
}

@Injectable()
export class UsersService {
  constructor(private readonly dataSource: DataSource) {}

  async create(
    input: CreateUserInput,
    actorId: string,
    manager?: EntityManager,
  ): Promise<UserEntity> {
    void actorId;
    const values = CreateUserSchema.parse(input);
    const repository = (manager ?? this.dataSource.manager).getRepository(UserEntity);
    const user = repository.create({
      phone: normalizeIranianMobile(values.phone),
      firstName: values.firstName,
      lastName: values.lastName,
      status: UserStatus.ACTIVE,
    });

    try {
      return await repository.save(user);
    } catch (error) {
      if (isPostgresUniqueViolation(error)) {
        throw new DomainError('PHONE_ALREADY_EXISTS', 'شماره موبایل قبلاً ثبت شده است.');
      }

      throw error;
    }
  }
}
