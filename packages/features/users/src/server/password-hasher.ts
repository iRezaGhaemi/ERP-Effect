import {
  randomBytes,
  scrypt as nodeScrypt,
  timingSafeEqual,
} from "node:crypto";

import { passwordWorkQueue } from "./password-work-queue.js";

const SCRYPT_VERSION = "v1";
const SCRYPT_N = 32768;
const SCRYPT_R = 8;
const SCRYPT_P = 3;
const SCRYPT_MAXMEM = 64 * 1024 * 1024;
const SALT_LENGTH = 16;
const KEY_LENGTH = 64;

type ParsedHash = {
  readonly salt: Buffer;
  readonly key: Buffer;
};

function decodeCanonicalBase64Url(
  value: string,
  expectedLength: number,
): Buffer | null {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;

  const decoded = Buffer.from(value, "base64url");
  if (
    decoded.length !== expectedLength ||
    decoded.toString("base64url") !== value
  ) {
    return null;
  }

  return decoded;
}

function parseHash(encoded: string): ParsedHash | null {
  const parts = encoded.split("$");
  if (
    parts.length !== 8 ||
    parts[0] !== "" ||
    parts[1] !== "scrypt" ||
    parts[2] !== SCRYPT_VERSION ||
    parts[3] !== String(SCRYPT_N) ||
    parts[4] !== String(SCRYPT_R) ||
    parts[5] !== String(SCRYPT_P)
  ) {
    return null;
  }

  const saltPart = parts[6];
  const keyPart = parts[7];
  if (saltPart === undefined || keyPart === undefined) return null;

  const salt = decodeCanonicalBase64Url(saltPart, SALT_LENGTH);
  const key = decodeCanonicalBase64Url(keyPart, KEY_LENGTH);
  return salt && key ? { salt, key } : null;
}

function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    nodeScrypt(
      password.normalize("NFC"),
      salt,
      KEY_LENGTH,
      { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P, maxmem: SCRYPT_MAXMEM },
      (error, derivedKey) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(derivedKey);
      },
    );
  });
}

export class PasswordHasher {
  async hash(password: string): Promise<string> {
    const salt = randomBytes(SALT_LENGTH);
    const key = await passwordWorkQueue.run(() => deriveKey(password, salt));

    return [
      "",
      "scrypt",
      SCRYPT_VERSION,
      SCRYPT_N,
      SCRYPT_R,
      SCRYPT_P,
      salt.toString("base64url"),
      key.toString("base64url"),
    ].join("$");
  }

  async verify(password: string, encoded: string): Promise<boolean> {
    const parsed = parseHash(encoded);
    if (!parsed) return false;

    const candidate = await passwordWorkQueue.run(() =>
      deriveKey(password, parsed.salt),
    );
    return (
      candidate.length === parsed.key.length &&
      timingSafeEqual(candidate, parsed.key)
    );
  }
}

export const passwordHasher = new PasswordHasher();
