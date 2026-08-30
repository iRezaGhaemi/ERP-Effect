export type AuthOptions = {
  pepper: string;
  ttlSeconds: number;
  resendSeconds: number;
  jwtAccessSecret: string;
  accessTtlSeconds: number;
  refreshTtlDays: number;
  cookieSecure: boolean;
};

export const AUTH_OPTIONS = Symbol("AUTH_OPTIONS");
