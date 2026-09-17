import { describe, expect, it } from "vitest";

import {
  ChangePasswordSchema,
  CreateCredentialsSchema,
  NewPasswordSchema,
  PasswordInputSchema,
  ResetPasswordSchema,
  SetupCredentialsSchema,
  UsernameSchema,
} from "./credential.schemas.js";

describe("credential schemas", () => {
  it("canonicalizes a valid username before returning it", () => {
    expect(UsernameSchema.parse(" Reza.Ghaemi ")).toBe("reza.ghaemi");
  });

  it.each([
    ["two characters", "ab"],
    ["more than 64 characters", `a${"b".repeat(64)}`],
    ["a leading digit", "1operator"],
    ["a leading separator", ".operator"],
    ["spaces inside", "reza ghaemi"],
    ["non-ASCII letters", "رضا"],
    ["an unsupported separator", "reza+ghaemi"],
  ])("rejects a username with %s", (_case, username) => {
    expect(UsernameSchema.safeParse(username).success).toBe(false);
  });

  it("accepts the exact username length boundaries", () => {
    expect(UsernameSchema.parse("abc")).toBe("abc");
    expect(UsernameSchema.parse(`a${"b".repeat(63)}`)).toHaveLength(64);
  });

  it("normalizes password input to NFC without trimming it", () => {
    expect(PasswordInputSchema.parse("  Cafe\u0301 password  ")).toBe(
      "  Café password  ",
    );
    expect(NewPasswordSchema.parse("  رمز بلند فارسی من  ")).toBe(
      "  رمز بلند فارسی من  ",
    );
  });

  it("counts normalized Unicode code points for password boundaries", () => {
    expect(PasswordInputSchema.safeParse("").success).toBe(false);
    expect(PasswordInputSchema.safeParse("🙂".repeat(128)).success).toBe(true);
    expect(PasswordInputSchema.safeParse("🙂".repeat(129)).success).toBe(false);
    expect(NewPasswordSchema.safeParse("🙂".repeat(13) + "x").success).toBe(
      false,
    );
    expect(NewPasswordSchema.safeParse("🙂".repeat(14) + "x").success).toBe(
      true,
    );
    expect(NewPasswordSchema.safeParse("🙂".repeat(129)).success).toBe(false);
  });

  it.each([
    ["too short", "Short phrase!"],
    ["one repeated ASCII character", "a".repeat(15)],
    ["one repeated Unicode character", "🙂".repeat(15)],
    ["a common numeric password", "123456789012345"],
    ["a common keyboard password", "qwertyuiopasdfgh"],
    ["a common English password", "passwordpassword"],
    ["a case variant of a common password", "PASSWORDPASSWORD"],
  ])("rejects a new password that is %s", (_case, password) => {
    expect(NewPasswordSchema.safeParse(password).success).toBe(false);
  });

  it("allows verification input that is weak but within 1 to 128 code points", () => {
    expect(PasswordInputSchema.parse("passwordpassword")).toBe(
      "passwordpassword",
    );
    expect(PasswordInputSchema.parse("a")).toBe("a");
  });

  it("applies the correct password policy to each credential payload", () => {
    const newPassword = "A sufficiently long password";
    const currentPassword = "a";

    expect(
      CreateCredentialsSchema.parse({
        username: " Admin.User ",
        initialPassword: newPassword,
      }),
    ).toEqual({ username: "admin.user", initialPassword: newPassword });
    expect(
      SetupCredentialsSchema.parse({
        username: " Legacy.User ",
        initialPassword: newPassword,
        actorPassword: currentPassword,
      }),
    ).toEqual({
      username: "legacy.user",
      initialPassword: newPassword,
      actorPassword: currentPassword,
    });
    expect(
      ResetPasswordSchema.parse({
        newPassword,
        actorPassword: currentPassword,
      }),
    ).toEqual({ newPassword, actorPassword: currentPassword });
    expect(
      ChangePasswordSchema.parse({ currentPassword, newPassword }),
    ).toEqual({ currentPassword, newPassword });

    expect(
      CreateCredentialsSchema.safeParse({
        username: "admin.user",
        initialPassword: "a",
      }).success,
    ).toBe(false);
    expect(
      ResetPasswordSchema.safeParse({
        newPassword: "a",
        actorPassword: currentPassword,
      }).success,
    ).toBe(false);
  });
});
