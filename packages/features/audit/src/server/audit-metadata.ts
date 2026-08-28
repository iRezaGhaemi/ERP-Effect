const sensitiveKeyFragments = [
  'accesstoken',
  'refreshtoken',
  'authorization',
  'credential',
  'cookie',
  'otp',
  'password',
  'secret',
] as const;

function isSensitiveKey(key: string): boolean {
  const normalized = key.replace(/[^a-z0-9]/gi, '').toLowerCase();
  return sensitiveKeyFragments.some((fragment) => normalized.includes(fragment));
}

function assertSafeValue(value: unknown, path: string, seen: WeakSet<object>): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertSafeValue(item, `${path}[${index}]`, seen));
    return;
  }

  if (typeof value !== 'object' || value === null) {
    return;
  }

  if (seen.has(value)) {
    throw new Error('Audit metadata must not contain circular references.');
  }
  seen.add(value);

  try {
    for (const [key, child] of Object.entries(value)) {
      if (isSensitiveKey(key)) {
        throw new Error(`Sensitive audit metadata key at ${path}.${key}.`);
      }
      assertSafeValue(child, `${path}.${key}`, seen);
    }
  } finally {
    seen.delete(value);
  }
}

export function assertSafeAuditMetadata(metadata: Record<string, unknown>): void {
  assertSafeValue(metadata, 'metadata', new WeakSet());
}
