import { z } from "zod";

const USERNAME_PATTERN = /^[a-z][a-z0-9._-]{2,63}$/;
const MIN_NEW_PASSWORD_CODE_POINTS = 15;
const MAX_PASSWORD_CODE_POINTS = 128;

// This intentionally small local list blocks obvious defaults; it is not a
// substitute for checking a dedicated breached-password corpus.
const COMMON_WEAK_PASSWORDS = new Set([
  "123456789012345",
  "adminadminadmin",
  "passwordpassword",
  "qwertyuiopasdfgh",
]);

function countCodePoints(value: string): number {
  return [...value].length;
}

function isRepeatedCharacter(value: string): boolean {
  return new Set(value).size === 1;
}

export const UsernameSchema = z
  .string()
  .transform((value) => value.trim().toLowerCase())
  .refine(
    (value) => USERNAME_PATTERN.test(value),
    "نام کاربری باید ۳ تا ۶۴ نویسه لاتین معتبر داشته باشد.",
  );

export const PasswordInputSchema = z
  .string()
  .transform((value) => value.normalize("NFC"))
  .refine(
    (value) => {
      const length = countCodePoints(value);
      return length >= 1 && length <= MAX_PASSWORD_CODE_POINTS;
    },
    "رمز عبور باید بین ۱ تا ۱۲۸ نویسه باشد.",
  );

export const NewPasswordSchema = PasswordInputSchema.refine(
  (value) => countCodePoints(value) >= MIN_NEW_PASSWORD_CODE_POINTS,
  "رمز عبور جدید باید حداقل ۱۵ نویسه باشد.",
).refine(
  (value) =>
    !isRepeatedCharacter(value) &&
    !COMMON_WEAK_PASSWORDS.has(value.toLowerCase()),
  "رمز عبور انتخاب‌شده بیش از حد ضعیف است.",
);

export const CreateCredentialsSchema = z.object({
  username: UsernameSchema,
  initialPassword: NewPasswordSchema,
});

export const SetupCredentialsSchema = CreateCredentialsSchema.extend({
  actorPassword: PasswordInputSchema,
});

export const ResetPasswordSchema = z.object({
  newPassword: NewPasswordSchema,
  actorPassword: PasswordInputSchema,
});

export const ChangePasswordSchema = z.object({
  currentPassword: PasswordInputSchema,
  newPassword: NewPasswordSchema,
});

export type CreateCredentialsInput = z.input<typeof CreateCredentialsSchema>;
export type SetupCredentialsInput = z.input<typeof SetupCredentialsSchema>;
export type ResetPasswordInput = z.input<typeof ResetPasswordSchema>;
export type ChangePasswordInput = z.input<typeof ChangePasswordSchema>;
