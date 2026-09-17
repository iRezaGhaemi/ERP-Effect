export type AuthOptions = {
  rateLimitSecret: string;
  jwtAccessSecret: string;
  accessTtlSeconds: number;
  refreshTtlDays: number;
  cookieSecure: boolean;
};

export const AUTH_OPTIONS = Symbol("AUTH_OPTIONS");
