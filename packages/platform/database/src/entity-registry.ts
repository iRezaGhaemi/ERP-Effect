import type { EntitySchema } from 'typeorm';
import { AuditLogEntity } from '@effect/audit/entities';
import { UserEntity } from '@effect/users/entities';

export const entityRegistry: Array<Function | EntitySchema> = [UserEntity, AuditLogEntity];
