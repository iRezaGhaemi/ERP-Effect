import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

import { AppModule } from '../src/app.module.js';

describe('health endpoints', () => {
  let app: INestApplication;
  const database = {
    query: vi.fn(),
  };

  beforeEach(async () => {
    database.query.mockReset();
    database.query.mockResolvedValue([{ '?column?': 1 }]);

    const module = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(DataSource)
      .useValue(database)
      .compile();

    app = module.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('reports liveness without querying the database', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/health/live')
      .expect(200)
      .expect({ status: 'ok' });

    expect(database.query).not.toHaveBeenCalled();
  });

  it('reports database readiness when PostgreSQL responds', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/health/ready')
      .expect(200)
      .expect({ status: 'ok', checks: { database: 'up' } });
  });

  it('returns 503 when PostgreSQL is unavailable', async () => {
    database.query.mockRejectedValueOnce(new Error('connection refused'));

    const response = await request(app.getHttpServer()).get('/api/v1/health/ready').expect(503);

    expect(response.body).toEqual({ status: 'error', checks: { database: 'down' } });
  });
});
