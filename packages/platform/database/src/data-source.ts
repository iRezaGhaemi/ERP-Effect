import 'reflect-metadata';

import { DataSource } from 'typeorm';

import { entityRegistry } from './entity-registry.js';
import { CreateUsers202608280001 } from './migrations/202608280001-create-users.js';

export type DatabaseOptions = {
  url: string;
};

export function createDataSource(options: DatabaseOptions): DataSource {
  return new DataSource({
    type: 'postgres',
    url: options.url,
    entities: entityRegistry,
    migrations: [CreateUsers202608280001],
    synchronize: false,
  });
}
