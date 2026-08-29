/**
 * Conservative key-name policy for metadata shared across audit actions.
 *
 * Keys are normalized for case and separators before matching. This does not inspect values or
 * claim to detect arbitrary secrets; action-specific schemas may reject additional fields.
 */
const sensitiveKeyFragments = [
  "token",
  "code",
  "phone",
  "mobile",
  "msisdn",
  "telephone",
  "authorization",
  "credential",
  "cookie",
  "otp",
  "password",
  "secret",
  "jwt",
  "bearer",
  "apikey",
  "privatekey",
  "signingkey",
  "encryptionkey",
  "decryptionkey",
  "accesskey",
  "jwk",
  "pem",
] as const;

const invalidAuditMetadataError = "Invalid audit metadata.";

function isSensitiveKey(key: string): boolean {
  const normalized = key.replace(/[^a-z0-9]/gi, "").toLowerCase();
  return sensitiveKeyFragments.some((fragment) =>
    normalized.includes(fragment),
  );
}

function assertSafeValue(value: unknown, seen: WeakSet<object>): void {
  if (typeof value !== "object" || value === null) {
    return;
  }

  if (seen.has(value)) {
    throw new Error(invalidAuditMetadataError);
  }
  seen.add(value);

  try {
    if (Array.isArray(value)) {
      value.forEach((item) => assertSafeValue(item, seen));
      return;
    }

    for (const [key, child] of Object.entries(value)) {
      if (isSensitiveKey(key)) {
        throw new Error(invalidAuditMetadataError);
      }
      assertSafeValue(child, seen);
    }
  } finally {
    seen.delete(value);
  }
}

export function assertSafeAuditMetadata(
  metadata: Record<string, unknown>,
): void {
  try {
    assertSafeValue(metadata, new WeakSet());
  } catch {
    throw new Error(invalidAuditMetadataError);
  }
}
