export type AuthOptions = {
  pepper: string;
  ttlSeconds: number;
  resendSeconds: number;
};

export const AUTH_OPTIONS = Symbol("AUTH_OPTIONS");
