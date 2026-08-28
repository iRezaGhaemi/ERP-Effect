import 'reflect-metadata';

import { DataSource } from 'typeorm';

import { entityRegistry } from './entity-registry.js';

export type DatabaseOptions = {
  url: string;
};

export function createDataSource(options: DatabaseOptions): DataSource {
  return new DataSource({
    type: 'postgres',
    url: options.url,
    entities: entityRegistry,
    synchronize: false,
  });
}
