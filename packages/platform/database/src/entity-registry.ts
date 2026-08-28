import type { EntitySchema } from 'typeorm';

export const entityRegistry: Array<Function | EntitySchema> = [];
