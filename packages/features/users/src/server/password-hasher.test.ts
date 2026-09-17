import { describe, expect, it } from "vitest";

import { DomainError } from "@effect-erp/contracts";

import { PasswordHasher, passwordHasher } from "./password-hasher.js";

const password = "A long test passphrase!";

describe("passwordHasher", () => {
  it("uses a fresh salt while preserving the strict scrypt profile", async () => {
    const one = await passwordHasher.hash(password);
    const two = await passwordHasher.hash(password);

    expect(one).not.toBe(two);
    expect(one).toMatch(
      /^\$scrypt\$v1\$32768\$8\$3\$[A-Za-z0-9_-]{22}\$[A-Za-z0-9_-]{86}$/,
    );
  });

  it("verifies the right password and rejects the wrong password", async () => {
    const encoded = await passwordHasher.hash(password);

    expect(await passwordHasher.verify(password, encoded)).toBe(true);
    expect(
      await passwordHasher.verify("Another test passphrase!", encoded),
    ).toBe(false);
  });

  it("treats canonically equivalent Unicode passwords as equal", async () => {
    const encoded = await passwordHasher.hash(
      "Cafe\u0301 and a sufficiently long phrase!",
    );

    expect(
      await passwordHasher.verify(
        "Café and a sufficiently long phrase!",
        encoded,
      ),
    ).toBe(true);
  });

  it.each([
    ["missing leading delimiter", "scrypt$huge$bad"],
    [
      "unknown version",
      "$scrypt$v2$32768$8$3$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    ],
    [
      "unsupported work factor",
      "$scrypt$v1$16384$8$3$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    ],
    [
      "non-canonical salt encoding",
      "$scrypt$v1$32768$8$3$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    ],
    [
      "salt with the wrong decoded length",
      "$scrypt$v1$32768$8$3$AAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    ],
    [
      "key with the wrong decoded length",
      "$scrypt$v1$32768$8$3$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    ],
  ])("rejects %s before deriving", async (_case, encoded) => {
    await expect(passwordHasher.verify(password, encoded)).resolves.toBe(false);
  });

  it("admits only two running and eight queued hashes, then recovers", async () => {
    const anotherCaller = new PasswordHasher();
    const attempts = Array.from({ length: 11 }, (_, index) =>
      (index % 2 === 0 ? passwordHasher : anotherCaller).hash(
        `A long queued passphrase ${index}!`,
      ),
    );
    const results = await Promise.allSettled(attempts);
    const fulfilled = results.filter(
      (result): result is PromiseFulfilledResult<string> =>
        result.status === "fulfilled",
    );
    const rejected = results.filter(
      (result): result is PromiseRejectedResult => result.status === "rejected",
    );

    expect(fulfilled).toHaveLength(10);
    expect(rejected).toHaveLength(1);
    expect(rejected[0]?.reason).toEqual(
      expect.objectContaining<Partial<DomainError>>({
        name: "DomainError",
        code: "PASSWORD_HASH_BUSY",
        message: "سامانه موقتاً مشغول است؛ لطفاً کمی بعد دوباره تلاش کنید.",
      }),
    );

    await expect(
      passwordHasher.hash("A later long test passphrase!"),
    ).resolves.toMatch(/^\$scrypt\$v1\$/);
  });
});
