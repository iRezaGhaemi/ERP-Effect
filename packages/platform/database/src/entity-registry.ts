import type { EntitySchema } from 'typeorm';
import { UserEntity } from '@effect/users/entities';

export const entityRegistry: Array<Function | EntitySchema> = [UserEntity];
