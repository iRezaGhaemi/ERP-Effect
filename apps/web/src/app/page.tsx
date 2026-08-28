type ReadyHealthResponse = {
  status: 'ok';
  checks: { database: 'up' };
};

export const dynamic = 'force-dynamic';

function isReadyHealthResponse(value: unknown): value is ReadyHealthResponse {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const response = value as { status?: unknown; checks?: { database?: unknown } };
  return response.status === 'ok' && response.checks?.database === 'up';
}

async function isApiReady(): Promise<boolean> {
  const internalApiUrl = process.env.INTERNAL_API_URL;
  if (!internalApiUrl) {
    return false;
  }

  try {
    const response = await fetch(new URL('/api/v1/health/ready', internalApiUrl), {
      cache: 'no-store',
    });
    const health = await response.json();

    return response.ok && isReadyHealthResponse(health);
  } catch {
    return false;
  }
}

export default async function HomePage() {
  const ready = await isApiReady();

  return <main>{ready ? 'Effect ERP آماده است' : 'Effect ERP در دسترس نیست'}</main>;
}
